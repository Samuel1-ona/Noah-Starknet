import React, { useState } from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
    language: string;
    code: string;
    title?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ language, code, title }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Box sx={{ mb: 4, borderRadius: 2, overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            {/* Code Header */}
            <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                px: 2,
                py: 1,
                background: 'rgba(255, 255, 255, 0.05)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                    {title || language.toUpperCase()}
                </Typography>
                <Tooltip title={copied ? "Copied!" : "Copy code"}>
                    <IconButton size="small" onClick={handleCopy} sx={{ color: copied ? 'success.main' : 'text.secondary' }}>
                        {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                    </IconButton>
                </Tooltip>
            </Box>

            {/* Code Body */}
            <Box sx={{ position: 'relative' }}>
                <SyntaxHighlighter
                    language={language}
                    style={vscDarkPlus}
                    customStyle={{
                        margin: 0,
                        padding: '16px',
                        background: '#1e1e1e', // Standard VSCode dark background
                        fontSize: '0.9rem',
                        fontFamily: '"Fira Code", "Consolas", monospace'
                    }}
                >
                    {code}
                </SyntaxHighlighter>
            </Box>
        </Box>
    );
};
