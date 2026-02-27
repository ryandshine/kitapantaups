import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from './dialog';
import { cn } from '@/lib/utils';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    children: React.ReactNode;
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    description,
    children,
    className,
    size = 'md'
}) => {
    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        full: 'max-w-[95vw] h-[95vh]'
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                className={cn(sizeClasses[size], className, "max-h-[90vh] overflow-y-auto")}
            >
                <DialogHeader>
                    {title && <DialogTitle>{title}</DialogTitle>}
                    {/* Always render DialogDescription to satisfy Radix UI accessibility requirement */}
                    <DialogDescription className={description ? undefined : 'sr-only'}>
                        {description || title || 'Dialog'}
                    </DialogDescription>
                </DialogHeader>
                {children}
            </DialogContent>
        </Dialog>
    );
};

export { DialogFooter as ModalFooter };
