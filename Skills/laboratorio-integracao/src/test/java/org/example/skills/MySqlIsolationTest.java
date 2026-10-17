package org.example.skills;

import org.junit.jupiter.api.Test;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import static org.junit.jupiter.api.Assertions.*;

@Testcontainers(disabledWithoutDocker = false)
class MySqlIsolationTest {
    @Container
    static final MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.4.6");

    @Test
    void scopesQueriesToAuthorizedWorkspaceAndRejectsDuplicateEvents() throws Exception {
        try (Connection connection = DriverManager.getConnection(mysql.getJdbcUrl(), mysql.getUsername(), mysql.getPassword())) {
            try (Statement statement = connection.createStatement()) {
                statement.executeUpdate("CREATE TABLE configurations (id BIGINT PRIMARY KEY, workspace_id BIGINT NOT NULL, name VARCHAR(100) NOT NULL, INDEX idx_workspace_id (workspace_id, id))");
                statement.executeUpdate("CREATE TABLE processed_events (event_id VARCHAR(36) PRIMARY KEY)");
                statement.executeUpdate("INSERT INTO configurations VALUES (1, 10, 'tenant-a'), (2, 20, 'tenant-b')");
            }
            assertEquals("tenant-a", findName(connection, 1, 10));
            assertNull(findName(connection, 2, 10), "Cross-workspace resource must not be visible");
            assertEquals("tenant-b", findName(connection, 2, 20));
            try (PreparedStatement insert = connection.prepareStatement("INSERT INTO processed_events (event_id) VALUES (?)")) {
                insert.setString(1, "event-1");
                assertEquals(1, insert.executeUpdate());
                assertThrows(java.sql.SQLException.class, insert::executeUpdate, "Duplicate event ID must be rejected");
            }
        }
    }

    private static String findName(Connection connection, long id, long authorizedWorkspace) throws Exception {
        try (PreparedStatement query = connection.prepareStatement("SELECT name FROM configurations WHERE id = ? AND workspace_id = ?")) {
            query.setLong(1, id);
            query.setLong(2, authorizedWorkspace);
            try (ResultSet rows = query.executeQuery()) {
                return rows.next() ? rows.getString(1) : null;
            }
        }
    }
}
