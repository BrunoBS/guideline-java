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

@Testcontainers
class WorkspaceAccessIsolationTest {
    @Container
    static final MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.4.6");

    @Test
    void resourceAccessMustBeScopedByAuthorizedWorkspaceAndCaller() throws Exception {
        try (Connection db = connect(); Statement s = db.createStatement()) {
            s.executeUpdate("CREATE TABLE access_grants (subject_id VARCHAR(32), workspace_id BIGINT, PRIMARY KEY(subject_id,workspace_id))");
            s.executeUpdate("CREATE TABLE scoped_resources (id BIGINT PRIMARY KEY, workspace_id BIGINT NOT NULL, value_text VARCHAR(32))");
            s.executeUpdate("INSERT INTO access_grants VALUES ('alice',10),('bob',20)");
            s.executeUpdate("INSERT INTO scoped_resources VALUES (101,10,'private-a'),(202,20,'private-b')");
        }
        assertEquals("private-a", findAuthorized("alice", 10, 101));
        assertNull(findAuthorized("alice", 10, 202), "cross-workspace IDOR");
        assertNull(findAuthorized("alice", 20, 202), "client-supplied workspace cannot grant access");
        assertNull(findAuthorized("anonymous", 10, 101), "missing caller");
        assertEquals("private-b", findAuthorized("bob", 20, 202));
        assertNull(findAuthorized("bob", 20, 101));
    }

    private String findAuthorized(String subject, long workspace, long resourceId) throws Exception {
        String sql = """
            SELECT r.value_text FROM scoped_resources r
            WHERE r.id = ? AND r.workspace_id = ?
              AND EXISTS (SELECT 1 FROM access_grants g
                          WHERE g.subject_id = ? AND g.workspace_id = r.workspace_id)
            """;
        try (Connection db = connect(); PreparedStatement ps = db.prepareStatement(sql)) {
            ps.setLong(1, resourceId);
            ps.setLong(2, workspace);
            ps.setString(3, subject);
            try (ResultSet rows = ps.executeQuery()) {
                return rows.next() ? rows.getString(1) : null;
            }
        }
    }

    private Connection connect() throws Exception {
        return DriverManager.getConnection(mysql.getJdbcUrl(), mysql.getUsername(), mysql.getPassword());
    }
}
