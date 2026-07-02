import assert from 'node:assert/strict'
import test from 'node:test'
import { getZipEntryName } from './archive-file-name'

test('keeps the stored document name unchanged inside a ZIP archive', () => {
    assert.equal(
        getZipEntryName('20260417_Dokumen_B66BD0.pdf'),
        '20260417_Dokumen_B66BD0.pdf',
    )
})
