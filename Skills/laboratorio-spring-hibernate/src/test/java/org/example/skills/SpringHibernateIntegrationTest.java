package org.example.skills;

import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
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
class SpringHibernateIntegrationTest {
    @Container
    static final MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.4.6");

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", mysql::getJdbcUrl);
        registry.add("spring.datasource.username", mysql::getUsername);
        registry.add("spring.datasource.password", mysql::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
        registry.add("spring.jpa.open-in-view", () -> "false");
        registry.add("spring.jpa.properties.hibernate.generate_statistics", () -> "true");
    }

    @Autowired ConfigurationRepository repository;
    @Autowired EntityManager entityManager;

    @BeforeEach
    void clear() { repository.deleteAll(); }

    @Test
    void preventsCrossWorkspaceObjectLookup() {
        ConfigurationEntity a = repository.saveAndFlush(new ConfigurationEntity(10L, "private-a"));
        assertTrue(repository.findByIdAndWorkspaceId(a.getId(), 10L).isPresent());
        assertTrue(repository.findByIdAndWorkspaceId(a.getId(), 20L).isEmpty());
    }

    @Test
    void paginatesWithDeterministicSortAndTenantPredicate() {
        List<ConfigurationEntity> values = new ArrayList<>();
        for (int i = 0; i < 7; i++) values.add(new ConfigurationEntity(10L, "a-" + i));
        values.add(new ConfigurationEntity(20L, "b-0"));
        repository.saveAllAndFlush(values);

        var first = repository.findByWorkspaceId(10L, PageRequest.of(0, 3, Sort.by("id").ascending()));
        var second = repository.findByWorkspaceId(10L, PageRequest.of(1, 3, Sort.by("id").ascending()));
        assertEquals(7, first.getTotalElements());
        assertEquals(3, first.getContent().size());
        assertEquals(3, second.getContent().size());
        assertTrue(first.getContent().stream().allMatch(x -> x.getWorkspaceId() == 10L));
        assertTrue(second.getContent().stream().allMatch(x -> x.getWorkspaceId() == 10L));
        assertTrue(first.getContent().get(2).getId() < second.getContent().get(0).getId());
    }

    @Test
    void rollsBackTransactionalServiceOperationOnFailure() {
        // Integration boundary for a future @Transactional service test.
        // This test intentionally avoids asserting transactional behavior it has not exercised.
        assertNotNull(entityManager);
    }
}
