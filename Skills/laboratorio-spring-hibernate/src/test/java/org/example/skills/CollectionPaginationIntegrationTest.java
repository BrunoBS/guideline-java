package org.example.skills;

import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import java.util.ArrayList;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Testcontainers(disabledWithoutDocker = false)
class CollectionPaginationIntegrationTest {
    @Container static final MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.4.6");

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", mysql::getJdbcUrl);
        registry.add("spring.datasource.username", mysql::getUsername);
        registry.add("spring.datasource.password", mysql::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
        registry.add("spring.jpa.open-in-view", () -> "false");
        registry.add("spring.jpa.properties.hibernate.query.fail_on_pagination_over_collection_fetch", () -> "true");
    }

    @Autowired PagedParentRepository repository;
    @Autowired EntityManager entityManager;

    @Test
    @Transactional
    void paginatesParentsBeforeFetchingChildrenAndPreservesWorkspace() {
        var parents = new ArrayList<PagedParentEntity>();
        for (int i = 0; i < 7; i++) {
            var parent = new PagedParentEntity(10L);
            parent.addChild("a-" + i + "-1");
            parent.addChild("a-" + i + "-2");
            parents.add(parent);
        }
        var other = new PagedParentEntity(20L);
        other.addChild("private");
        parents.add(other);
        repository.saveAllAndFlush(parents);
        entityManager.clear();

        var page = repository.findByWorkspaceId(10L, PageRequest.of(1, 3, Sort.by("id").ascending()));
        assertEquals(7, page.getTotalElements());
        assertEquals(3, page.getContent().size());
        var ids = page.getContent().stream().map(PagedParentEntity::getId).toList();

        entityManager.clear();
        List<PagedParentEntity> hydrated = repository.fetchPageChildren(10L, ids);
        assertEquals(ids, hydrated.stream().map(PagedParentEntity::getId).toList());
        assertEquals(3, hydrated.size());
        assertTrue(hydrated.stream().allMatch(p -> p.getWorkspaceId() == 10L));
        assertTrue(hydrated.stream().allMatch(p -> p.getChildren().size() == 2));
    }

    @Test
    @Transactional
    void rejectsPaginationOverCollectionFetchRatherThanSilentlyPagingInMemory() {
        var parent = new PagedParentEntity(10L);
        parent.addChild("one");
        parent.addChild("two");
        repository.saveAndFlush(parent);
        entityManager.clear();

        assertThrows(RuntimeException.class, () -> entityManager.createQuery(
            "select distinct p from PagedParentEntity p left join fetch p.children where p.workspaceId = :workspaceId order by p.id",
            PagedParentEntity.class)
            .setParameter("workspaceId", 10L)
            .setFirstResult(0)
            .setMaxResults(1)
            .getResultList());
    }
}
