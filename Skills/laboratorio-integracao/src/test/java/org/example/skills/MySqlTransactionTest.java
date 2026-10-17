package org.example.skills;

import org.junit.jupiter.api.Test;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import static org.junit.jupiter.api.Assertions.*;

@Testcontainers(disabledWithoutDocker = false)
class MySqlTransactionTest {
    @Container
    static final MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.4.6");

    @Test
    void rollsBackEventMarkerAndBusinessMutationTogether() throws Exception {
        try (Connection connection = DriverManager.getConnection(mysql.getJdbcUrl(), mysql.getUsername(), mysql.getPassword())) {
            try (Statement statement = connection.createStatement()) {
                statement.executeUpdate("CREATE TABLE tx_events (event_id VARCHAR(36) PRIMARY KEY)");
                statement.executeUpdate("CREATE TABLE tx_effects (id BIGINT PRIMARY KEY, value_text VARCHAR(50))");
            }
            connection.setAutoCommit(false);
            try {
                try (Statement statement = connection.createStatement()) {
                    statement.executeUpdate("INSERT INTO tx_events VALUES ('event-rollback')");
                    statement.executeUpdate("INSERT INTO tx_effects VALUES (1, 'effect')");
                }
                connection.rollback();
            } finally {
                connection.setAutoCommit(true);
            }
            try (Statement statement = connection.createStatement();
                 var markers = statement.executeQuery("SELECT COUNT(*) FROM tx_events")) {
                assertTrue(markers.next());
                assertEquals(0, markers.getInt(1));
            }
            try (Statement statement = connection.createStatement();
                 var effects = statement.executeQuery("SELECT COUNT(*) FROM tx_effects")) {
                assertTrue(effects.next());
                assertEquals(0, effects.getInt(1));
            }
        }
    }

    @Test
    void rejectsDuplicateMarkerWithoutCommittingSecondEffect() throws Exception {
        try (Connection connection = DriverManager.getConnection(mysql.getJdbcUrl(), mysql.getUsername(), mysql.getPassword())) {
            try (Statement statement = connection.createStatement()) {
                statement.executeUpdate("CREATE TABLE dedup_events (event_id VARCHAR(36) PRIMARY KEY)");
                statement.executeUpdate("CREATE TABLE dedup_effects (id BIGINT PRIMARY KEY, value_text VARCHAR(50))");
            }
            connection.setAutoCommit(false);
            try {
                try (Statement statement = connection.createStatement()) {
                    statement.executeUpdate("INSERT INTO dedup_events VALUES ('event-1')");
                    statement.executeUpdate("INSERT INTO dedup_effects VALUES (1, 'first')");
                }
                connection.commit();
                assertThrows(SQLException.class, () -> {
                    try (Statement statement = connection.createStatement()) {
                        statement.executeUpdate("INSERT INTO dedup_events VALUES ('event-1')");
                        statement.executeUpdate("INSERT INTO dedup_effects VALUES (2, 'duplicate')");
                    }
                });
                connection.rollback();
            } finally {
                connection.setAutoCommit(true);
            }
            try (Statement statement = connection.createStatement();
                 var rows = statement.executeQuery("SELECT COUNT(*) FROM dedup_effects")) {
                assertTrue(rows.next());
                assertEquals(1, rows.getInt(1));
            }
        }
    }
}
