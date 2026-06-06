import { router, useForm, usePage } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import { MessageSquare, Send, Trash2 } from 'lucide-react';
import * as React from 'react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import * as fileCommentsRoute from '@/actions/App/Http/Controllers/FileCommentController';
import { cn } from '@/lib/utils';

export interface Comment {
    id: number;
    user_id: number;
    body: string;
    created_at: string;
    user: { id: number; name: string };
}

function CommentItem({
    comment,
    fileId,
    canDelete,
    isOwn,
    onCommentDeleted,
}: {
    comment: Comment;
    fileId: number;
    canDelete: boolean;
    isOwn: boolean;
    onCommentDeleted?: () => void;
}) {
    const [deleting, setDeleting] = React.useState(false);

    function handleDelete() {
        setDeleting(true);
        router.delete(fileCommentsRoute.destroy({ fileId, commentId: comment.id }).url, {
            preserveScroll: true,
            onSuccess: () => onCommentDeleted?.(),
            onFinish: () => setDeleting(false),
        });
    }

    return (
        <div className="flex gap-3 py-3">
            <Avatar>
                <AvatarFallback className="text-xs font-medium uppercase">
                    {comment.user.name.charAt(0)}
                </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{comment.user.name}</span>
                        {isOwn && (
                            <span className="bg-primary/10 text-primary rounded-xl px-2 py-0.5 text-xs font-medium">
                                Вы
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs">
                            {format(parseISO(comment.created_at), 'dd.MM.yyyy HH:mm')}
                        </span>
                        {canDelete && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={handleDelete}
                                disabled={deleting}
                                className="size-6 text-muted-foreground hover:bg-transparent hover:text-destructive"
                            >
                                <Trash2 className="size-3.5" />
                            </Button>
                        )}
                    </div>
                </div>
                <p className="text-sm whitespace-pre-wrap">{comment.body}</p>
            </div>
        </div>
    );
}

interface Props {
    fileId: number;
    comments: Comment[];
    loading?: boolean;
    className?: string;
    onCommentPosted?: () => void;
    onCommentDeleted?: () => void;
}

export function CommentsSection({ fileId, comments, loading = false, className, onCommentPosted, onCommentDeleted }: Props) {
    const { auth } = usePage().props;
    const isAdmin = auth.user.is_admin;
    const currentUserId = auth.user.id;

    const { data, setData, post, processing, reset, errors } = useForm({ body: '' });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post(fileCommentsRoute.store(fileId).url, {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onCommentPosted?.();
            },
        });
    }

    return (
        <div className={cn(className)}>
            <div className="mb-4 flex items-center gap-2">
                <MessageSquare className="text-muted-foreground size-4" />
                <h2 className="font-semibold">
                    Комментарии{' '}
                    {!loading && (
                        <span className="text-muted-foreground font-normal">({comments.length})</span>
                    )}
                </h2>
            </div>

            {loading ? (
                <div className="space-y-4 py-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex gap-3">
                            <Skeleton className="size-8 shrink-0 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-3 w-24" />
                                <Skeleton className="h-3 w-full" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : comments.length === 0 ? (
                <p className="text-muted-foreground py-4 text-center text-sm">
                    Комментариев пока нет
                </p>
            ) : (
                <div className="divide-y">
                    {comments.map((comment) => (
                        <CommentItem
                            key={comment.id}
                            comment={comment}
                            fileId={fileId}
                            canDelete={isAdmin || comment.user_id === currentUserId}
                            isOwn={comment.user_id === currentUserId}
                            onCommentDeleted={onCommentDeleted}
                        />
                    ))}
                </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-2">
                <Textarea
                    value={data.body}
                    onChange={(e) => setData('body', e.target.value)}
                    placeholder="Напишите комментарий…"
                    rows={3}
                    className="resize-none"
                />
                {errors.body && <p className="text-destructive text-xs">{errors.body}</p>}
                <div className="flex justify-end">
                    <Button type="submit" size="sm" disabled={processing || !data.body.trim()}>
                        <Send className="size-3.5" />
                        Отправить
                    </Button>
                </div>
            </form>
        </div>
    );
}
