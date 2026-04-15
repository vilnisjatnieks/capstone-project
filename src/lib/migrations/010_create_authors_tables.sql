CREATE TABLE authors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    sort_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_authors_name_lower ON authors(lower(name));

CREATE TABLE work_authors (
    work_id BIGINT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES authors(id) ON DELETE RESTRICT,
    role TEXT NOT NULL DEFAULT 'author' CHECK (role IN ('author', 'editor', 'translator')),
    position INT NOT NULL DEFAULT 0,
    PRIMARY KEY (work_id, author_id, role)
);

CREATE INDEX idx_work_authors_author_id ON work_authors(author_id);

INSERT INTO authors (name)
SELECT DISTINCT trim(editor)
FROM works
WHERE editor IS NOT NULL AND trim(editor) <> '';

INSERT INTO work_authors (work_id, author_id, role, position)
SELECT w.id, a.id, 'editor', 0
FROM works w
JOIN authors a ON a.name = trim(w.editor)
WHERE w.editor IS NOT NULL AND trim(w.editor) <> '';

ALTER TABLE works DROP COLUMN editor;
