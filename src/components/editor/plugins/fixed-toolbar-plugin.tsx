'use client';

import { createPlatePlugin } from '@udecode/plate/react';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';

import { FixedToolbar } from '@/components/plate-ui/fixed-toolbar';
import { FixedToolbarButtons } from '@/components/plate-ui/fixed-toolbar-buttons';

// Component that renders the toolbar in the dashboard container using a portal
const ToolbarPortal = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  const container = document.getElementById('editor-toolbar-container');
  if (!container) return null;

  return createPortal(
    <FixedToolbar>
      <FixedToolbarButtons />
    </FixedToolbar>,
    container
  );
};

export const FixedToolbarPlugin = createPlatePlugin({
  key: 'fixed-toolbar',
  render: {
    beforeEditable: () => <ToolbarPortal />,
  },
});
