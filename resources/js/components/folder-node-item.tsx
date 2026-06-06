import { ChevronRight, Folder } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export interface FlatFolder {
    id: number;
    name: string;
    parent_id: number | null;
}

export interface FolderNode extends FlatFolder {
    children: FolderNode[];
}

export function buildTree(folders: FlatFolder[]): FolderNode[] {
    const map = new Map<number, FolderNode>();
    const roots: FolderNode[] = [];

    for (const f of folders) {
        map.set(f.id, { ...f, children: [] });
    }

    for (const f of folders) {
        const node = map.get(f.id)!;

        if (f.parent_id === null) {
            roots.push(node);
        } else {
            map.get(f.parent_id)?.children.push(node);
        }
    }

    return roots;
}

export function getAncestorIds(folders: FlatFolder[], folderId: number | null): Set<number> {
    if (folderId === null) {
        return new Set();
    }

    const map = new Map(folders.map((f) => [f.id, f]));
    const ancestors = new Set<number>();
    let current = map.get(folderId);

    while (current?.parent_id != null) {
        ancestors.add(current.parent_id);
        current = map.get(current.parent_id);
    }

    return ancestors;
}

export function FolderNodeItem({
    node,
    selectedId,
    onSelect,
    openIds,
}: {
    node: FolderNode;
    selectedId: number | null;
    onSelect: (id: number | null) => void;
    openIds: Set<number>;
}) {
    const hasChildren = node.children.length > 0;

    return (
        <Collapsible defaultOpen={openIds.has(node.id)}>
            <div className="flex items-center gap-0.5">
                {hasChildren ? (
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-6 shrink-0">
                            <ChevronRight className="size-3 transition-transform duration-150 [[data-state=open]_&]:rotate-90" />
                        </Button>
                    </CollapsibleTrigger>
                ) : (
                    <span className="size-6 shrink-0" />
                )}
                <button
                    type="button"
                    className={cn(
                        'flex flex-1 items-center gap-1.5 rounded px-2 py-1 text-sm transition-colors hover:bg-accent',
                        selectedId === node.id && 'bg-accent font-medium',
                    )}
                    onClick={() => onSelect(node.id)}
                >
                    <Folder className="size-3.5 shrink-0 text-muted-foreground" />
                    {node.name}
                </button>
            </div>
            {hasChildren && (
                <CollapsibleContent>
                    <div className="ml-6 border-l pl-1">
                        {node.children.map((child) => (
                            <FolderNodeItem
                                key={child.id}
                                node={child}
                                selectedId={selectedId}
                                onSelect={onSelect}
                                openIds={openIds}
                            />
                        ))}
                    </div>
                </CollapsibleContent>
            )}
        </Collapsible>
    );
}
