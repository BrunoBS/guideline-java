package org.example.skills;

import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import java.util.ArrayList;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Testcontainers(disabledWithoutDocker = false)
class NPlusOneIntegrationTest {
    @Container static final MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.4.6");

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", mysql::getJdbcUrl);
        registry.add("spring.datasource.username", mysql::getUsername);
        registry.add("spring.datasource.password", mysql::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
        registry.add("spring.jpa.open-in-view", () -> "false");
        registry.add("spring.jpa.properties.hibernate.generate_statistics", () -> "true");
    }

    @Autowired ConfigurationWithDetailRepository repository;
    @Autowired EntityManager entityManager;
    @Autowired EntityManagerFactory entityManagerFactory;

    @Test
    void comparesLazyNPlusOneToFetchJoinWithoutLeakingWorkspaces() {
        List<ConfigurationWithDetailEntity> rows = new ArrayList<>();
        for (int i = 0; i < 5; i++) rows.add(new ConfigurationWithDetailEntity(10L, new ConfigurationDetailEntity("a-" + i)));
        rows.add(new ConfigurationWithDetailEntity(20L, new ConfigurationDetailEntity("private-b")));
        repository.saveAllAndFlush(rows);
        entityManager.clear();

        var statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        statistics.clear();
        var lazy = repository.findByWorkspaceIdOrderByIdAsc(10L);
        assertEquals(5, lazy.size());
        for (var row : lazy) assertTrue(row.getDetail().getDescription().startsWith("a-"));
        long lazyQueries = statistics.getPrepareStatementCount();
        assertTrue(lazyQueries >= 6, "Expected N+1: one root query and at least five detail queries, got " + lazyQueries);

        entityManager.clear();
        statistics.clear();
        var fetched = repository.findWithDetailByWorkspaceId(10L);
        assertEquals(5, fetched.size());
        for (var row : fetched) assertTrue(row.getDetail().getDescription().startsWith("a-"));
        long fetchQueries = statistics.getPrepareStatementCount();
        assertEquals(1, fetchQueries, "To-one join fetch should load all five rows in one statement");
        assertTrue(lazyQueries > fetchQueries);
    }
}
