import React from 'react';
import { Tooltip } from 'antd';
import { formatText } from '../../common/RichTextEditor';

interface FormatBtnProps {
    icon: React.ElementType;
    title: string;
    cmd: string;
    active?: boolean;
}

export const FormatBtn = ({ icon: Icon, title, cmd, active }: FormatBtnProps) => (
    <Tooltip title={title}>
        <button
            onClick={() => formatText(cmd)}
            className={`p-1.5 rounded hover:bg-black/5 text-[#555] transition-colors ${active ? 'bg-black/10 text-black' : ''}`}
            type="button"
        >
            <Icon size={16} strokeWidth={2} />
        </button>
    </Tooltip>
);
