'use client';

import { withCn } from '@udecode/cn';

import { Toolbar } from './toolbar';

export const FixedToolbar = withCn(
  Toolbar,
  'fixed top-[110px] left-0 right-0 z-40 w-full justify-between overflow-x-auto border-t border-b border-b-border bg-background p-1 shadow-sm'
);
