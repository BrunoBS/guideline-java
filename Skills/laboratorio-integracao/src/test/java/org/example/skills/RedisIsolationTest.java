package org.example.skills;

import org.junit.jupiter.api.Test;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import redis.clients.jedis.Jedis;
import static org.junit.jupiter.api.Assertions.*;

@Testcontainers(disabledWithoutDocker = false)
class RedisIsolationTest {
    @Container
    static final GenericContainer<?> redis = new GenericContainer<>("redis:7.4.5-alpine").withExposedPorts(6379);

    @Test
    void isolatesCacheKeysByWorkspaceAndSupportsExpiry() throws Exception {
        try (Jedis jedis = new Jedis(redis.getHost(), redis.getMappedPort(6379))) {
            assertEquals("PONG", jedis.ping());
            jedis.setex("workspace:10:config:feature-x", 60, "enabled");
            jedis.setex("workspace:20:config:feature-x", 60, "disabled");
            assertEquals("enabled", jedis.get("workspace:10:config:feature-x"));
            assertEquals("disabled", jedis.get("workspace:20:config:feature-x"));
            assertNull(jedis.get("workspace:30:config:feature-x"));
            jedis.setex("workspace:10:config:ephemeral", 1, "temporary");
            Thread.sleep(1300);
            assertNull(jedis.get("workspace:10:config:ephemeral"));
        }
    }
}
