package org.example.skills;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ConfigurationWithDetailRepository extends JpaRepository<ConfigurationWithDetailEntity, Long> {
    List<ConfigurationWithDetailEntity> findByWorkspaceIdOrderByIdAsc(Long workspaceId);

    @Query("select c from ConfigurationWithDetailEntity c join fetch c.detail where c.workspaceId = :workspaceId order by c.id")
    List<ConfigurationWithDetailEntity> findWithDetailByWorkspaceId(@Param("workspaceId") Long workspaceId);
}
