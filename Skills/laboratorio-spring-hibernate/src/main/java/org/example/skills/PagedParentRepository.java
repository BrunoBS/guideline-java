package org.example.skills;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PagedParentRepository extends JpaRepository<PagedParentEntity, Long> {
    Page<PagedParentEntity> findByWorkspaceId(Long workspaceId, Pageable pageable);

    @Query("select distinct p from PagedParentEntity p left join fetch p.children where p.workspaceId = :workspaceId and p.id in :ids order by p.id")
    List<PagedParentEntity> fetchPageChildren(@Param("workspaceId") Long workspaceId, @Param("ids") List<Long> ids);
}
