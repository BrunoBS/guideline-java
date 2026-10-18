package org.example.skills;

import jakarta.persistence.*;

@Entity
@Table(name = "skill_paged_children")
public class PagedChildEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "parent_id", nullable = false)
    private PagedParentEntity parent;
    @Column(nullable = false)
    private String label;

    protected PagedChildEntity() {}
    PagedChildEntity(PagedParentEntity parent, String label) {
        this.parent = parent;
        this.label = label;
    }
    public Long getId() { return id; }
    public String getLabel() { return label; }
}
