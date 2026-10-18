package org.example.skills;

import org.junit.jupiter.api.Test;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import redis.clients.jedis.JedisPooled;

import java.time.Duration;
import java.util.ArrayList;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

@Testcontainers
class RedisCacheStampedeTest {
    @Container static final GenericContainer<?> redis =
        new GenericContainer<>("redis:7.4.5").withExposedPorts(6379);

    @Test
    void oneLeaderRebuildsCacheAndOthersReadPublishedValue() throws Exception {
        try (var jedis = new JedisPooled(redis.getHost(), redis.getMappedPort(6379))) {
            String cacheKey = "skills:stampede:value";
            String lockKey = "skills:stampede:lock";
            jedis.del(cacheKey, lockKey);
            int callers = 12;
            var rebuilds = new AtomicInteger();
            var start = new CountDownLatch(1);
            try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
                var tasks = new ArrayList<java.util.concurrent.Future<String>>();
                for (int i = 0; i < callers; i++) {
                    tasks.add(executor.submit((Callable<String>) () -> {
                        assertTrue(start.await(5, TimeUnit.SECONDS));
                        long deadline = System.nanoTime() + Duration.ofSeconds(10).toNanos();
                        while (System.nanoTime() < deadline) {
                            String cached = jedis.get(cacheKey);
                            if (cached != null) return cached;
                            String acquired = jedis.set(lockKey, "owner", new redis.clients.jedis.params.SetParams().nx().px(5000));
                            if ("OK".equals(acquired)) {
                                try {
                                    // Double-check after lock acquisition: another leader may have populated the cache.
                                    cached = jedis.get(cacheKey);
                                    if (cached != null) return cached;
                                    rebuilds.incrementAndGet();
                                    Thread.sleep(100);
                                    jedis.setex(cacheKey, 30, "workspace-config");
                                    return "workspace-config";
                                } finally {
                                    // Safe only for this bounded test: lock lease outlives rebuild.
                                    if ("owner".equals(jedis.get(lockKey))) jedis.del(lockKey);
                                }
                            }
                            Thread.sleep(20);
                        }
                        throw new AssertionError("Timed out waiting for cache rebuild");
                    }));
                }
                start.countDown();
                for (var future : tasks) assertEquals("workspace-config", future.get(15, TimeUnit.SECONDS));
            }
            assertEquals(1, rebuilds.get(), "Concurrent cache misses should produce one rebuild");
            assertEquals("workspace-config", jedis.get(cacheKey));
        }
    }
}
