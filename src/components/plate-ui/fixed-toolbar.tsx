'use client';

import { withCn } from '@udecode/cn';

import { Toolbar } from './toolbar';

export const FixedToolbar = withCn(
  Toolbar,
  'relative w-full justify-between overflow-x-auto border-t border-b border-b-border bg-background p-1 shadow-sm'
);
