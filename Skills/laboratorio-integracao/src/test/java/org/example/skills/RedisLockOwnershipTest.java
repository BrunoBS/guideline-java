package org.example.skills;

import org.junit.jupiter.api.Test;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import redis.clients.jedis.JedisPooled;
import redis.clients.jedis.params.SetParams;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@Testcontainers
class RedisLockOwnershipTest {
    @Container
    static final GenericContainer<?> redis =
        new GenericContainer<>("redis:7.4.5").withExposedPorts(6379);

    private static final String RELEASE_IF_OWNER = """
        if redis.call('get', KEYS[1]) == ARGV[1] then
            return redis.call('del', KEYS[1])
        else
            return 0
        end
        """;

    @Test
    void onlyCurrentOwnerMayReleaseLock() {
        try (var jedis = client()) {
            String key = "skills:lock:ownership";
            jedis.del(key);
            String alice = UUID.randomUUID().toString();
            String bob = UUID.randomUUID().toString();

            assertEquals("OK", jedis.set(key, alice, new SetParams().nx().px(10_000)));
            assertNull(jedis.set(key, bob, new SetParams().nx().px(10_000)));
            assertEquals(0L, release(jedis, key, bob));
            assertEquals(alice, jedis.get(key));
            assertEquals(1L, release(jedis, key, alice));
            assertNull(jedis.get(key));
            assertEquals("OK", jedis.set(key, bob, new SetParams().nx().px(10_000)));
            assertEquals(0L, release(jedis, key, alice));
            assertEquals(bob, jedis.get(key));
        }
    }

    @Test
    void expiredOwnerCannotDeleteReacquiredLock() throws Exception {
        try (var jedis = client()) {
            String key = "skills:lock:lease";
            jedis.del(key);
            String oldOwner = UUID.randomUUID().toString();
            String newOwner = UUID.randomUUID().toString();
            assertEquals("OK", jedis.set(key, oldOwner, new SetParams().nx().px(150)));
            long deadline = System.nanoTime() + java.time.Duration.ofSeconds(5).toNanos();
            while (jedis.exists(key) && System.nanoTime() < deadline) Thread.sleep(20);
            assertFalse(jedis.exists(key), "Lease must expire before reacquisition");
            assertEquals("OK", jedis.set(key, newOwner, new SetParams().nx().px(10_000)));
            assertEquals(0L, release(jedis, key, oldOwner));
            assertEquals(newOwner, jedis.get(key));
            assertEquals(1L, release(jedis, key, newOwner));
        }
    }

    @Test
    void crashedLeaderLeaseExpiresAndFollowerCanRecover() throws Exception {
        try (var jedis = client()) {
            String key = "skills:lock:crash";
            jedis.del(key);
            String failedLeader = UUID.randomUUID().toString();
            String follower = UUID.randomUUID().toString();
            assertEquals("OK", jedis.set(key, failedLeader, new SetParams().nx().px(150)));
            // Leader disappears without release: Redis expires the lease.
            long deadline = System.nanoTime() + java.time.Duration.ofSeconds(5).toNanos();
            String acquired = null;
            while (acquired == null && System.nanoTime() < deadline) {
                acquired = jedis.set(key, follower, new SetParams().nx().px(10_000));
                if (acquired == null) Thread.sleep(20);
            }
            assertEquals("OK", acquired, "Follower should eventually acquire after lease expiry");
            assertEquals(0L, release(jedis, key, failedLeader));
            assertEquals(follower, jedis.get(key));
            assertEquals(1L, release(jedis, key, follower));
        }
    }

    private JedisPooled client() {
        return new JedisPooled(redis.getHost(), redis.getMappedPort(6379));
    }

    private long release(JedisPooled jedis, String key, String owner) {
        return ((Number) jedis.eval(RELEASE_IF_OWNER, List.of(key), List.of(owner))).longValue();
    }
}
