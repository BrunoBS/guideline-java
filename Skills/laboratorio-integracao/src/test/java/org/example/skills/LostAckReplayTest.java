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

@Testcontainers
class LostAckReplayTest {
    @Container
    static final MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.4.6");

    @Test
    void lostAckAfterCommitMustNotRepeatLocalEffect() throws Exception {
        try (Connection db = connect(); Statement s = db.createStatement()) {
            s.executeUpdate("CREATE TABLE inbox_events (event_id VARCHAR(50) PRIMARY KEY) ENGINE=InnoDB");
            s.executeUpdate("CREATE TABLE local_effects (event_id VARCHAR(50) NOT NULL, effect_value INT NOT NULL) ENGINE=InnoDB");
        }
        assertTrue(process("event-1"), "first delivery commits");
        // Simulate a lost broker ACK: the same message is delivered again.
        assertFalse(process("event-1"), "replay is deduplicated by the durable inbox");
        try (Connection db = connect(); Statement s = db.createStatement();
             var rs = s.executeQuery("SELECT COUNT(*), COALESCE(SUM(effect_value),0) FROM local_effects")) {
            assertTrue(rs.next());
            assertEquals(1, rs.getInt(1));
            assertEquals(7, rs.getInt(2));
        }
    }

    private boolean process(String eventId) throws Exception {
        try (Connection db = connect()) {
            db.setAutoCommit(false);
            try {
                try (var inbox = db.prepareStatement("INSERT INTO inbox_events(event_id) VALUES (?)");
                     var effect = db.prepareStatement("INSERT INTO local_effects(event_id,effect_value) VALUES (?,7)")) {
                    inbox.setString(1, eventId);
                    inbox.executeUpdate();
                    effect.setString(1, eventId);
                    effect.executeUpdate();
                }
                db.commit();
                return true;
            } catch (SQLException failure) {
                db.rollback();
                if (failure.getErrorCode() == 1062) return false;
                throw failure;
            }
        }
    }

    private Connection connect() throws Exception {
        return DriverManager.getConnection(mysql.getJdbcUrl(), mysql.getUsername(), mysql.getPassword());
    }
}
