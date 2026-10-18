package org.example.skills;

import org.junit.jupiter.api.Test;
import org.testcontainers.containers.MySQLContainer;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Real MySQL authorization boundary. HTTP/JWT filter-chain behavior is covered
 * separately by SpringSecurityHttpChainTest; this test proves SQL tenant scoping.
 */
class WorkspaceResourceJdbcAuthorizationTest {

    @Test
    void resourceLookupMustScopeBothGrantAndResourceInRealMysql() throws Exception {
        try (var mysql = new MySQLContainer<>("mysql:8.4.6")) {
            mysql.start();
            try (var connection = DriverManager.getConnection(
                    mysql.getJdbcUrl(), mysql.getUsername(), mysql.getPassword())) {
                createSchema(connection);
                seed(connection);

                assertEquals(Optional.of("resource-a"), lookup(connection, "alice", 10, 101));
                assertEquals(Optional.empty(), lookup(connection, "alice", 10, 202));
                assertEquals(Optional.empty(), lookup(connection, "alice", 20, 202));
                assertEquals(Optional.of("resource-b"), lookup(connection, "bob", 20, 202));
                assertEquals(Optional.empty(), lookup(connection, "bob", 10, 101));
                assertEquals(Optional.empty(), lookup(connection, "alice", 10, 999));

                // Revocation must take effect on the next database-backed check.
                execute(connection, "DELETE FROM workspace_grant WHERE subject='alice' AND workspace_id=10");
                assertEquals(Optional.empty(), lookup(connection, "alice", 10, 101));
            }
        }
    }

    private static Optional<String> lookup(Connection connection, String subject,
                                           long workspaceId, long resourceId) throws SQLException {
        // Both the resource and the grant are scoped by workspace.
        // No resource can be read based on an untrusted resource ID alone.
        String sql = """
            SELECT r.name FROM resource r
            WHERE r.id = ? AND r.workspace_id = ?
              AND EXISTS (
                  SELECT 1 FROM workspace_grant g
                  WHERE g.subject = ? AND g.workspace_id = r.workspace_id
              )
            """;
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setLong(1, resourceId);
            statement.setLong(2, workspaceId);
            statement.setString(3, subject);
            try (ResultSet rows = statement.executeQuery()) {
                return rows.next() ? Optional.of(rows.getString(1)) : Optional.empty();
            }
        }
    }

    private static void createSchema(Connection connection) throws SQLException {
        execute(connection, "CREATE TABLE workspace_grant (subject VARCHAR(80) NOT NULL, workspace_id BIGINT NOT NULL, PRIMARY KEY(subject, workspace_id))");
        execute(connection, "CREATE TABLE resource (id BIGINT PRIMARY KEY, workspace_id BIGINT NOT NULL, name VARCHAR(80) NOT NULL, INDEX idx_resource_workspace (workspace_id, id))");
    }

    private static void seed(Connection connection) throws SQLException {
        execute(connection, "INSERT INTO workspace_grant VALUES ('alice',10),('bob',20)");
        execute(connection, "INSERT INTO resource VALUES (101,10,'resource-a'),(202,20,'resource-b'),(303,30,'resource-c')");
    }

    private static void execute(Connection connection, String sql) throws SQLException {
        try (var statement = connection.createStatement()) {
            statement.execute(sql);
        }
    }
}
