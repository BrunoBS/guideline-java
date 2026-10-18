package org.example.skills;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
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
import java.nio.charset.StandardCharsets;
import java.sql.DriverManager;
import java.time.Instant;
import java.util.Date;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

@Testcontainers
class JwtHttpWorkspaceAuthorizationTest {
    @Container static final MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.4.6");
    private static final byte[] KEY = "only-for-guideline-isolated-jwt-http-test-2026".getBytes(StandardCharsets.UTF_8);
    private static final byte[] WRONG_KEY = "different-isolated-jwt-http-test-secret-2026".getBytes(StandardCharsets.UTF_8);
    private static final String ISSUER = "https://issuer.example.test";
    private static final String AUDIENCE = "workspace-lab";

    @Test
    void authenticatesJwtThenChecksWorkspaceGrantAndResource() throws Exception {
        try (var db = DriverManager.getConnection(mysql.getJdbcUrl(), mysql.getUsername(), mysql.getPassword());
             var sql = db.createStatement()) {
            sql.executeUpdate("CREATE TABLE jwt_grants (subject_id VARCHAR(32), workspace_id BIGINT, PRIMARY KEY(subject_id,workspace_id))");
            sql.executeUpdate("CREATE TABLE jwt_resources (id BIGINT PRIMARY KEY, workspace_id BIGINT, content VARCHAR(40))");
            sql.executeUpdate("INSERT INTO jwt_grants VALUES ('alice',10),('bob',20)");
            sql.executeUpdate("INSERT INTO jwt_resources VALUES (101,10,'alice-resource'),(202,20,'bob-resource')");
        }
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/resources", exchange -> {
            try {
                String header = exchange.getRequestHeaders().getFirst("Authorization");
                String subject = header != null && header.startsWith("Bearer ")
                    ? verifiedSubject(header.substring(7)) : null;
                if (subject == null) {
                    exchange.sendResponseHeaders(401, -1);
                    return;
                }
                long workspace;
                long resource;
                try {
                    workspace = Long.parseLong(exchange.getRequestHeaders().getFirst("X-Workspace-Id"));
                    String[] segments = exchange.getRequestURI().getPath().split("/");
                    if (segments.length != 3 || !"resources".equals(segments[1])) throw new NumberFormatException();
                    resource = Long.parseLong(segments[2]);
                } catch (NumberFormatException invalid) {
                    exchange.sendResponseHeaders(400, -1);
                    return;
                }
                boolean granted;
                try (var db = DriverManager.getConnection(mysql.getJdbcUrl(), mysql.getUsername(), mysql.getPassword());
                     var statement = db.prepareStatement("SELECT 1 FROM jwt_grants WHERE subject_id=? AND workspace_id=?")) {
                    statement.setString(1, subject);
                    statement.setLong(2, workspace);
                    try (var rows = statement.executeQuery()) { granted = rows.next(); }
                }
                if (!granted) {
                    exchange.sendResponseHeaders(403, -1);
                    return;
                }
                String content = null;
                try (var db = DriverManager.getConnection(mysql.getJdbcUrl(), mysql.getUsername(), mysql.getPassword());
                     var statement = db.prepareStatement("SELECT content FROM jwt_resources WHERE id=? AND workspace_id=?")) {
                    statement.setLong(1, resource);
                    statement.setLong(2, workspace);
                    try (var rows = statement.executeQuery()) {
                        if (rows.next()) content = rows.getString(1);
                    }
                }
                if (content == null) {
                    exchange.sendResponseHeaders(404, -1);
                } else {
                    byte[] bytes = content.getBytes(StandardCharsets.UTF_8);
                    exchange.sendResponseHeaders(200, bytes.length);
                    try (var output = exchange.getResponseBody()) { output.write(bytes); }
                }
            } catch (Exception failure) {
                exchange.sendResponseHeaders(500, -1);
            } finally {
                exchange.close();
            }
        });
        server.start();
        try (var client = HttpClient.newHttpClient()) {
            int port = server.getAddress().getPort();
            String alice = token(KEY, "alice", ISSUER, AUDIENCE, 300);
            String bob = token(KEY, "bob", ISSUER, AUDIENCE, 300);
            assertEquals(200, get(client, port, alice, "10", 101));
            assertEquals(200, get(client, port, bob, "20", 202));
            assertEquals(403, get(client, port, alice, "20", 202), "forged workspace");
            assertEquals(404, get(client, port, alice, "10", 202), "cross-workspace ID");
            assertEquals(404, get(client, port, alice, "10", 999));
            assertEquals(401, get(client, port, null, "10", 101));
            assertEquals(401, get(client, port, token(WRONG_KEY, "alice", ISSUER, AUDIENCE, 300), "10", 101));
            assertEquals(401, get(client, port, token(KEY, "alice", ISSUER, AUDIENCE, -10), "10", 101));
            assertEquals(401, get(client, port, token(KEY, "alice", "other-issuer", AUDIENCE, 300), "10", 101));
            assertEquals(401, get(client, port, token(KEY, "alice", ISSUER, "other-audience", 300), "10", 101));
            assertEquals(400, get(client, port, alice, "invalid", 101));
        } finally {
            server.stop(0);
        }
    }

    private String verifiedSubject(String token) {
        try {
            SignedJWT jwt = SignedJWT.parse(token);
            if (!JWSAlgorithm.HS256.equals(jwt.getHeader().getAlgorithm())
                || !jwt.verify(new MACVerifier(KEY))) return null;
            JWTClaimsSet claims = jwt.getJWTClaimsSet();
            if (!ISSUER.equals(claims.getIssuer()) || !claims.getAudience().contains(AUDIENCE)
                || claims.getExpirationTime() == null
                || !claims.getExpirationTime().toInstant().isAfter(Instant.now())
                || claims.getNotBeforeTime() == null
                || claims.getNotBeforeTime().toInstant().isAfter(Instant.now())
                || claims.getSubject() == null || claims.getSubject().isBlank()) return null;
            return claims.getSubject();
        } catch (Exception invalid) {
            return null;
        }
    }

    private String token(byte[] key, String subject, String issuer, String audience, long expiresInSeconds) throws Exception {
        Instant now = Instant.now();
        var claims = new JWTClaimsSet.Builder().subject(subject).issuer(issuer).audience(List.of(audience))
            .issueTime(Date.from(now)).notBeforeTime(Date.from(now.minusSeconds(10)))
            .expirationTime(Date.from(now.plusSeconds(expiresInSeconds))).build();
        var jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
        jwt.sign(new MACSigner(key));
        return jwt.serialize();
    }

    private int get(HttpClient client, int port, String token, String workspace, long id) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/resources/" + id)).GET();
        if (token != null) request.header("Authorization", "Bearer " + token);
        request.header("X-Workspace-Id", workspace);
        return client.send(request.build(), HttpResponse.BodyHandlers.discarding()).statusCode();
    }
}
