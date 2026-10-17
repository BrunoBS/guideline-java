package org.example.skills;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class JwtWorkspaceAuthorizationTest {
    private static final byte[] KEY = "local-jwt-lab-key-not-for-production-2026-very-long".getBytes(StandardCharsets.UTF_8);
    private static final byte[] WRONG_KEY = "wrong-local-jwt-lab-key-not-for-production-2026".getBytes(StandardCharsets.UTF_8);
    private static final String ISSUER = "https://issuer.example.test";
    private static final String AUDIENCE = "guideline-api";

    @Test
    void acceptsSignedTokenWithValidIssuerAudienceAndLifetime() throws Exception {
        assertEquals("alice", validate(issue(KEY, "alice", ISSUER, AUDIENCE, -60, 600)));
    }

    @Test
    void rejectsWrongSignature() throws Exception {
        assertNull(validate(issue(WRONG_KEY, "alice", ISSUER, AUDIENCE, -60, 600)));
    }

    @Test
    void rejectsExpiredAndNotYetValidTokens() throws Exception {
        assertNull(validate(issue(KEY, "alice", ISSUER, AUDIENCE, -600, -1)));
        assertNull(validate(issue(KEY, "alice", ISSUER, AUDIENCE, 600, 1200)));
    }

    @Test
    void rejectsWrongIssuerAudienceAndMissingSubject() throws Exception {
        assertNull(validate(issue(KEY, "alice", "https://other.example.test", AUDIENCE, -60, 600)));
        assertNull(validate(issue(KEY, "alice", ISSUER, "another-api", -60, 600)));
        assertNull(validate(issue(KEY, "", ISSUER, AUDIENCE, -60, 600)));
    }

    @Test
    void rejectsTamperingAndUnparseableInput() throws Exception {
        String token = issue(KEY, "alice", ISSUER, AUDIENCE, -60, 600);
        String[] parts = token.split("\\.");
        String tampered = parts[0] + "." + parts[1].substring(0, parts[1].length() - 1)
            + (parts[1].endsWith("A") ? "B" : "A") + "." + parts[2];
        assertNull(validate(tampered));
        assertNull(validate("not-a-jwt"));
        assertNull(validate(null));
    }

    private String issue(byte[] key, String subject, String issuer, String audience,
                         long notBeforeSeconds, long expiresSeconds) throws Exception {
        Instant now = Instant.now();
        var claims = new JWTClaimsSet.Builder()
            .subject(subject)
            .issuer(issuer)
            .audience(List.of(audience))
            .issueTime(Date.from(now))
            .notBeforeTime(Date.from(now.plusSeconds(notBeforeSeconds)))
            .expirationTime(Date.from(now.plusSeconds(expiresSeconds)))
            .build();
        var jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
        jwt.sign(new MACSigner(key));
        return jwt.serialize();
    }

    private String validate(String token) {
        if (token == null) return null;
        try {
            SignedJWT jwt = SignedJWT.parse(token);
            if (!JWSAlgorithm.HS256.equals(jwt.getHeader().getAlgorithm())) return null;
            if (!jwt.verify(new MACVerifier(KEY))) return null;
            JWTClaimsSet claims = jwt.getJWTClaimsSet();
            Instant now = Instant.now();
            if (!ISSUER.equals(claims.getIssuer()) || !claims.getAudience().contains(AUDIENCE)) return null;
            if (claims.getExpirationTime() == null || !claims.getExpirationTime().toInstant().isAfter(now)) return null;
            if (claims.getNotBeforeTime() == null || claims.getNotBeforeTime().toInstant().isAfter(now)) return null;
            String subject = claims.getSubject();
            return subject == null || subject.isBlank() ? null : subject;
        } catch (Exception invalid) {
            return null;
        }
    }
}
