import { router, useForm, usePage } from '@inertiajs/react';
import { format, parseISO } from 'date-fns';
import { Send, Trash2 } from 'lucide-react';
import * as React from 'react';

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
        <div className="py-2.5">
            <div className="mb-1 flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground">
                    {comment.user.name}
                </span>
                {isOwn && (
                    <span className="text-muted-foreground text-xs">Вы</span>
                )}
                <span className="text-muted-foreground ml-auto text-xs">
                    {format(parseISO(comment.created_at), 'dd.MM HH:mm')}
                </span>
                {canDelete && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleDelete}
                        disabled={deleting}
                        className="size-5 shrink-0 text-muted-foreground hover:bg-transparent hover:text-destructive"
                    >
                        <Trash2 className="size-3" />
                    </Button>
                )}
            </div>
            <p className="text-sm leading-relaxed">{comment.body}</p>
        </div>
    );
}

interface Props {
    fileId: number;
    comments: Comment[];
    loading?: boolean;
    className?: string;
    scrollClassName?: string;
    onCommentPosted?: () => void;
    onCommentDeleted?: () => void;
}

export function CommentsSection({ fileId, comments, loading = false, className, scrollClassName, onCommentPosted, onCommentDeleted }: Props) {
    const { auth } = usePage().props;
    const isAdmin = auth.user.is_admin;
    const currentUserId = auth.user.id;

    const { data, setData, post, processing, reset, errors } = useForm({ body: '' });

    const scrollRef = React.useRef<HTMLDivElement>(null);
    const prevCountRef = React.useRef(comments.length);

    React.useEffect(() => {
        if (comments.length > prevCountRef.current && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
        prevCountRef.current = comments.length;
    }, [comments.length]);

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
        <div className={cn('border-l-2 border-primary pl-4', className)}>
            <div className="mb-3 flex items-center gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
                    Комментарии
                </span>
                {!loading && (
                    <span className="text-muted-foreground text-xs">({comments.length})</span>
                )}
            </div>

            <div ref={scrollRef} className={cn('max-h-64 overflow-y-auto', scrollClassName)}>
                {loading ? (
                    <div className="space-y-4 py-1">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="space-y-1.5">
                                <Skeleton className="h-2.5 w-20" />
                                <Skeleton className="h-3 w-full" />
                                <Skeleton className="h-3 w-2/3" />
                            </div>
                        ))}
                    </div>
                ) : comments.length === 0 ? (
                    <p className="text-muted-foreground py-4 text-sm">
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
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-2">
                <Textarea
                    value={data.body}
                    onChange={(e) => setData('body', e.target.value)}
                    placeholder="Напишите комментарий…"
                    maxLength={2000}
                    rows={3}
                    className="resize-none"
                />
                <div className="flex items-center justify-between">
                    {errors.body
                        ? <p className="text-xs text-destructive">{errors.body}</p>
                        : <span />
                    }
                    <p className={cn('text-xs', data.body.length >= 2000 ? 'text-destructive' : 'text-muted-foreground')}>
                        {data.body.length}/2000
                    </p>
                </div>
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
