package org.example.skills;

import org.junit.jupiter.api.Test;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

@Testcontainers(disabledWithoutDocker = false)
class ConcurrentIdempotencyTest {
    @Container
    static final MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.4.6");

    @Test
    void concurrentConsumersCommitExactlyOneDatabaseEffectForSameEvent() throws Exception {
        try (Connection setup = connect(); Statement ddl = setup.createStatement()) {
            ddl.executeUpdate("CREATE TABLE race_events (event_id VARCHAR(64) PRIMARY KEY) ENGINE=InnoDB");
            ddl.executeUpdate("CREATE TABLE race_effects (id BIGINT AUTO_INCREMENT PRIMARY KEY, event_id VARCHAR(64) NOT NULL) ENGINE=InnoDB");
        }

        var ready = new CountDownLatch(2);
        var start = new CountDownLatch(1);
        var committed = new AtomicInteger();
        var duplicates = new AtomicInteger();
        try (var executor = Executors.newFixedThreadPool(2)) {
            var work = (java.util.concurrent.Callable<Void>) () -> {
                ready.countDown();
                if (!start.await(10, TimeUnit.SECONDS)) throw new AssertionError("start timeout");
                try (Connection connection = connect()) {
                    connection.setAutoCommit(false);
                    try {
                        try (Statement statement = connection.createStatement()) {
                            statement.executeUpdate("INSERT INTO race_events(event_id) VALUES ('same-event')");
                            statement.executeUpdate("INSERT INTO race_effects(event_id) VALUES ('same-event')");
                        }
                        connection.commit();
                        committed.incrementAndGet();
                    } catch (SQLException duplicateOrOtherSqlFailure) {
                        connection.rollback();
                        if (duplicateOrOtherSqlFailure.getErrorCode() == 1062) {
                            duplicates.incrementAndGet();
                        } else {
                            throw duplicateOrOtherSqlFailure;
                        }
                    }
                }
                return null;
            };
            var first = executor.submit(work);
            var second = executor.submit(work);
            assertTrue(ready.await(10, TimeUnit.SECONDS), "both consumers must be ready");
            start.countDown();
            first.get(30, TimeUnit.SECONDS);
            second.get(30, TimeUnit.SECONDS);
        }
        assertEquals(1, committed.get());
        assertEquals(1, duplicates.get());
        try (Connection check = connect(); Statement statement = check.createStatement();
             var rows = statement.executeQuery("SELECT COUNT(*) FROM race_effects WHERE event_id='same-event'")) {
            assertTrue(rows.next());
            assertEquals(1, rows.getInt(1));
        }
    }

    private Connection connect() throws SQLException {
        return DriverManager.getConnection(mysql.getJdbcUrl(), mysql.getUsername(), mysql.getPassword());
    }
}
