import test from 'node:test';
import assert from 'node:assert/strict';
import { createFileChunks } from '../src/utils/chunkUtils.js';

test('createFileChunks: chunks 12 files into slices of max 5', () => {
  const files = Array.from({ length: 12 }, (_, i) => ({
    name: `doc_${i + 1}.pdf`,
    size: 1024 * 1024, // 1MB
  }));

  const chunks = createFileChunks(files, 5, 20 * 1024 * 1024);
  assert.equal(chunks.length, 3);
  assert.equal(chunks[0].length, 5);
  assert.equal(chunks[1].length, 5);
  assert.equal(chunks[2].length, 2);

  const flattened = chunks.flat();
  assert.equal(flattened.length, 12);
  assert.equal(flattened[0].name, 'doc_1.pdf');
  assert.equal(flattened[11].name, 'doc_12.pdf');
});

test('createFileChunks: respects 20MB limit even with fewer than 5 files', () => {
  const files = [
    { name: 'big_1.pdf', size: 12 * 1024 * 1024 }, // 12MB
    { name: 'big_2.pdf', size: 12 * 1024 * 1024 }, // 12MB (12+12=24MB > 20MB -> splits)
    { name: 'small_1.pdf', size: 2 * 1024 * 1024 },
  ];

  const chunks = createFileChunks(files, 5, 20 * 1024 * 1024);
  assert.equal(chunks.length, 2);
  assert.equal(chunks[0].length, 1);
  assert.equal(chunks[0][0].name, 'big_1.pdf');
  assert.equal(chunks[1].length, 2);
  assert.equal(chunks[1][0].name, 'big_2.pdf');
  assert.equal(chunks[1][1].name, 'small_1.pdf');
});
