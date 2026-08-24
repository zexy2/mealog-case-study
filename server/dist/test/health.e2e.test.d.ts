/**
 * Boots the real Nest application and drives it over HTTP.
 *
 * This is the check that the edge actually starts: a unit test on the
 * controller class would pass even if the module graph were broken, which is
 * the failure that would block every later wave.
 */
import 'reflect-metadata';
