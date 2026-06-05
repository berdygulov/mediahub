import { Link, usePage } from '@inertiajs/react';
import { ChevronRight, Folder } from 'lucide-react';
import * as React from 'react';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    SidebarMenuAction,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { index as foldersIndex, show as foldersShow } from '@/routes/folders';

interface FlatFolder {
    id: number;
    name: string;
    parent_id: number | null;
}

interface FolderNode extends FlatFolder {
    children: FolderNode[];
}

function buildTree(folders: FlatFolder[]): FolderNode[] {
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

function getAncestorIds(folders: FlatFolder[], folderId: number | null): Set<number> {
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

function FolderLeafItem({ node, isActive }: { node: FolderNode; isActive: boolean }) {
    return (
        <SidebarMenuSubItem>
            <SidebarMenuSubButton asChild isActive={isActive} size="sm">
                <Link href={foldersShow.url(node.id)} prefetch>
                    <Folder />
                    <span>{node.name}</span>
                </Link>
            </SidebarMenuSubButton>
        </SidebarMenuSubItem>
    );
}

function FolderBranchItem({
    node,
    currentFolderId,
    openIds,
}: {
    node: FolderNode;
    currentFolderId: number | null;
    openIds: Set<number>;
}) {
    const isActive = node.id === currentFolderId;
    const shouldBeOpen = openIds.has(node.id) || isActive;
    const [isOpen, setIsOpen] = React.useState(shouldBeOpen);
    const [childGeneration, setChildGeneration] = React.useState(0);

    React.useEffect(() => {
        if (shouldBeOpen) {
            setIsOpen(true);
        }
    }, [shouldBeOpen]);

    function handleOpenChange(open: boolean) {
        setIsOpen(open);
        if (!open) {
            setChildGeneration((g) => g + 1);
        }
    }

    return (
        <SidebarMenuSubItem>
            <Collapsible open={isOpen} onOpenChange={handleOpenChange}>
                <div className="flex items-center gap-0.5">
                    <CollapsibleTrigger asChild>
                        <button
                            type="button"
                            className="hover:bg-sidebar-accent flex size-5 shrink-0 items-center justify-center rounded"
                        >
                            <ChevronRight className="size-3 transition-transform duration-150 [[data-state=open]_&]:rotate-90" />
                        </button>
                    </CollapsibleTrigger>
                    <SidebarMenuSubButton asChild isActive={isActive} size="sm" className="min-w-0 flex-1">
                        <Link href={foldersShow.url(node.id)} prefetch>
                            <Folder />
                            <span>{node.name}</span>
                        </Link>
                    </SidebarMenuSubButton>
                </div>
                <CollapsibleContent>
                    <SidebarMenuSub>
                        {node.children.map((child) => (
                            <FolderTreeItem
                                key={`${child.id}-${childGeneration}`}
                                node={child}
                                currentFolderId={currentFolderId}
                                openIds={openIds}
                            />
                        ))}
                    </SidebarMenuSub>
                </CollapsibleContent>
            </Collapsible>
        </SidebarMenuSubItem>
    );
}

function FolderTreeItem({
    node,
    currentFolderId,
    openIds,
}: {
    node: FolderNode;
    currentFolderId: number | null;
    openIds: Set<number>;
}) {
    if (node.children.length === 0) {
        return <FolderLeafItem node={node} isActive={node.id === currentFolderId} />;
    }

    return <FolderBranchItem node={node} currentFolderId={currentFolderId} openIds={openIds} />;
}

export function NavFolders() {
    const { currentUrl, isCurrentOrParentUrl } = useCurrentUrl();
    const { sidebarFolders = [] } = usePage().props;

    const currentFolderId = React.useMemo(() => {
        const match = currentUrl.match(/^\/folders\/(\d+)/);
        return match ? parseInt(match[1], 10) : null;
    }, [currentUrl]);

    const openIds = React.useMemo(
        () => getAncestorIds(sidebarFolders, currentFolderId),
        [sidebarFolders, currentFolderId],
    );

    const tree = React.useMemo(() => buildTree(sidebarFolders), [sidebarFolders]);

    const isOnFoldersPage = isCurrentOrParentUrl(foldersIndex());
    const [isOpen, setIsOpen] = React.useState(isOnFoldersPage);
    const [childGeneration, setChildGeneration] = React.useState(0);

    React.useEffect(() => {
        if (isOnFoldersPage) {
            setIsOpen(true);
        }
    }, [isOnFoldersPage]);

    function handleOpenChange(open: boolean) {
        setIsOpen(open);
        if (!open) {
            setChildGeneration((g) => g + 1);
        }
    }

    return (
        <SidebarMenuItem>
            <Collapsible open={isOpen} onOpenChange={handleOpenChange}>
                <SidebarMenuButton asChild isActive={isOnFoldersPage} tooltip={{ children: 'Все папки' }}>
                    <Link href={foldersIndex()} prefetch>
                        <Folder />
                        <span>Все папки</span>
                    </Link>
                </SidebarMenuButton>
                {tree.length > 0 && (
                    <CollapsibleTrigger asChild>
                        <SidebarMenuAction>
                            <ChevronRight className="transition-transform duration-150 [[data-state=open]_&]:rotate-90" />
                        </SidebarMenuAction>
                    </CollapsibleTrigger>
                )}
                {tree.length > 0 && (
                    <CollapsibleContent>
                        <SidebarMenuSub>
                            {tree.map((node) => (
                                <FolderTreeItem
                                    key={`${node.id}-${childGeneration}`}
                                    node={node}
                                    currentFolderId={currentFolderId}
                                    openIds={openIds}
                                />
                            ))}
                        </SidebarMenuSub>
                    </CollapsibleContent>
                )}
            </Collapsible>
        </SidebarMenuItem>
    );
}
