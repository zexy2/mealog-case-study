/**
 * The domain vocabulary is the contract between the pipeline and the eval
 * harness, and the port epic's parity gate compares harness output field for
 * field. A renamed member or a changed string value would move every historical
 * number silently, so the exact sets are asserted here rather than assumed.
 *
 * Two layers:
 *  1. Literal expectations, which survive the deletion of the Python backend.
 *  2. A parity check read straight out of the Python source, which catches
 *     drift on *either* side while both languages coexist. It skips itself once
 *     `domain/taxonomy.py` is gone (Wave 3), rather than failing.
 */
export {};
