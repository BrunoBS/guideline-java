package org.example.skills;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "skill_paged_parents")
public class PagedParentEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "workspace_id", nullable = false)
    private Long workspaceId;
    @OneToMany(mappedBy = "parent", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PagedChildEntity> children = new ArrayList<>();

    protected PagedParentEntity() {}
    public PagedParentEntity(Long workspaceId) { this.workspaceId = workspaceId; }
    public void addChild(String label) {
        var child = new PagedChildEntity(this, label);
        children.add(child);
    }
    public Long getId() { return id; }
    public Long getWorkspaceId() { return workspaceId; }
    public List<PagedChildEntity> getChildren() { return children; }
}
