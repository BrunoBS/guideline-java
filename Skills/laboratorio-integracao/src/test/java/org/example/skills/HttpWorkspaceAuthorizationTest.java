package org.example.skills;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.sql.DriverManager;
import java.util.Map;
import java.util.concurrent.Executors;

import static org.junit.jupiter.api.Assertions.*;

@Testcontainers
class HttpWorkspaceAuthorizationTest {
    @Container static final MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.4.6");

    @Test
    void deniesCrossWorkspaceAndForgedContextOverRealHttp() throws Exception {
        try (var db = DriverManager.getConnection(mysql.getJdbcUrl(), mysql.getUsername(), mysql.getPassword());
             var sql = db.createStatement()) {
            sql.executeUpdate("CREATE TABLE http_grants (subject_id VARCHAR(32), workspace_id BIGINT, PRIMARY KEY(subject_id, workspace_id))");
            sql.executeUpdate("CREATE TABLE http_resources (id BIGINT PRIMARY KEY, workspace_id BIGINT, content VARCHAR(40))");
            sql.executeUpdate("INSERT INTO http_grants VALUES ('alice',10),('bob',20)");
            sql.executeUpdate("INSERT INTO http_resources VALUES (101,10,'resource-a'),(202,20,'resource-b')");
        }

        // Test-only credential mapping: NOT JWT validation or Spring Security.
        Map<String,String> credentials = Map.of("test-alice", "alice", "test-bob", "bob");
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/resources", exchange -> {
            try {
                String authorization = exchange.getRequestHeaders().getFirst("Authorization");
                String subject = authorization == null || !authorization.startsWith("Bearer ")
                    ? null : credentials.get(authorization.substring(7));
                if (subject == null) {
                    exchange.sendResponseHeaders(401, -1);
                    return;
                }
                String workspaceHeader = exchange.getRequestHeaders().getFirst("X-Workspace-Id");
                long workspace;
                long resource;
                try {
                    workspace = Long.parseLong(workspaceHeader);
                    String[] segments = exchange.getRequestURI().getPath().split("/");
                    if (segments.length != 3 || !segments[1].equals("resources")) throw new NumberFormatException();
                    resource = Long.parseLong(segments[2]);
                } catch (NumberFormatException invalid) {
                    exchange.sendResponseHeaders(400, -1);
                    return;
                }
                String value = null;
                try (var db = DriverManager.getConnection(mysql.getJdbcUrl(), mysql.getUsername(), mysql.getPassword());
                     var query = db.prepareStatement("""
                         SELECT r.content FROM http_resources r
                         WHERE r.id = ? AND r.workspace_id = ?
                           AND EXISTS (SELECT 1 FROM http_grants g
                                       WHERE g.subject_id = ? AND g.workspace_id = r.workspace_id)
                         """)) {
                    query.setLong(1, resource);
                    query.setLong(2, workspace);
                    query.setString(3, subject);
                    try (var rows = query.executeQuery()) {
                        if (rows.next()) value = rows.getString(1);
                    }
                }
                if (value == null) {
                    exchange.sendResponseHeaders(404, -1);
                } else {
                    byte[] bytes = value.getBytes(java.nio.charset.StandardCharsets.UTF_8);
                    exchange.sendResponseHeaders(200, bytes.length);
                    try (var out = exchange.getResponseBody()) { out.write(bytes); }
                }
            } catch (Exception failure) {
                exchange.sendResponseHeaders(500, -1);
            } finally {
                exchange.close();
            }
        });
        server.setExecutor(Executors.newVirtualThreadPerTaskExecutor());
        server.start();
        try (var client = HttpClient.newHttpClient()) {
            int port = server.getAddress().getPort();
            assertEquals(200, get(client, port, "test-alice", "10", 101));
            assertEquals(404, get(client, port, "test-alice", "10", 202));
            assertEquals(404, get(client, port, "test-alice", "20", 202));
            assertEquals(200, get(client, port, "test-bob", "20", 202));
            assertEquals(404, get(client, port, "test-bob", "20", 101));
            assertEquals(401, get(client, port, null, "10", 101));
            assertEquals(401, get(client, port, "invalid-token", "10", 101));
            assertEquals(400, get(client, port, "test-alice", "not-a-number", 101));
        } finally {
            server.stop(0);
        }
    }

    private int get(HttpClient client, int port, String token, String workspace, long id) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/resources/" + id)).GET();
        if (token != null) builder.header("Authorization", "Bearer " + token);
        if (workspace != null) builder.header("X-Workspace-Id", workspace);
        return client.send(builder.build(), HttpResponse.BodyHandlers.discarding()).statusCode();
    }
}
