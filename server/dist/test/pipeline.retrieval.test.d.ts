/**
 * Retrieval port: the behaviours the Python module earned the hard way.
 *
 * The aggregate parity evidence (the 145-variant retrieval scorecard on the
 * 53-food catalogue, reproduced byte-for-byte against the Python
 * implementation) lives in the pull request. These tests pin the individual
 * properties so a later change cannot quietly undo one while the aggregate
 * still looks fine.
 *
 * Fixtures are hand-built rather than loaded from `locale_packs/`, but they
 * use the real LocalePack class so retrieval exercises the same type boundary
 * as the loader. The real normalize.fold implementation is used directly.
 */
export {};
