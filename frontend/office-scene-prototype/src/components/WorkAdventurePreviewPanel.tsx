import {
  WORKADVENTURE_PREVIEW_ASSET_LICENSE_PATH,
  WORKADVENTURE_PREVIEW_AVATARS,
  WORKADVENTURE_PREVIEW_LICENSE_SCOPE,
  WORKADVENTURE_PREVIEW_MAP_LICENSE_PATH,
  WORKADVENTURE_PREVIEW_MAP_PATH,
  WORKADVENTURE_PREVIEW_MODE,
  WORKADVENTURE_PREVIEW_OFFICE_ZONES,
  WORKADVENTURE_PREVIEW_PROVENANCE_PATH,
  WORKADVENTURE_PREVIEW_SOURCE,
  WORKADVENTURE_PREVIEW_STATS,
  WORKADVENTURE_PREVIEW_THUMBNAIL_PATH,
  WORKADVENTURE_PREVIEW_TILESET_COUNT,
} from "../data/workAdventurePreviewCatalog";

export function WorkAdventurePreviewPanel() {
  return (
    <section
      className="wa-preview-panel"
      data-wa-preview-root
      data-wa-preview-mode={WORKADVENTURE_PREVIEW_MODE}
      data-wa-preview-source={WORKADVENTURE_PREVIEW_SOURCE}
      data-wa-preview-license-scope={WORKADVENTURE_PREVIEW_LICENSE_SCOPE}
      data-wa-preview-provenance-path={WORKADVENTURE_PREVIEW_PROVENANCE_PATH}
      data-wa-preview-asset-license-path={WORKADVENTURE_PREVIEW_ASSET_LICENSE_PATH}
      data-wa-preview-map-license-path={WORKADVENTURE_PREVIEW_MAP_LICENSE_PATH}
      data-wa-preview-map-path={WORKADVENTURE_PREVIEW_MAP_PATH}
      data-wa-preview-thumbnail-path={WORKADVENTURE_PREVIEW_THUMBNAIL_PATH}
      data-wa-preview-map-width={String(WORKADVENTURE_PREVIEW_STATS.mapWidthTiles)}
      data-wa-preview-map-height={String(WORKADVENTURE_PREVIEW_STATS.mapHeightTiles)}
      data-wa-preview-tile-size={String(WORKADVENTURE_PREVIEW_STATS.tileSize)}
      data-wa-preview-visible-tile-layer-count={String(WORKADVENTURE_PREVIEW_STATS.visibleTileLayerCount)}
      data-wa-preview-walkable-tile-count={String(WORKADVENTURE_PREVIEW_STATS.walkableTileCount)}
      data-wa-preview-collision-tile-count={String(WORKADVENTURE_PREVIEW_STATS.collisionTileCount)}
      data-wa-preview-start-tile-count={String(WORKADVENTURE_PREVIEW_STATS.startTileCount)}
      data-wa-preview-zone-count={String(WORKADVENTURE_PREVIEW_STATS.interactionZoneCount)}
      data-wa-preview-zone-names="clockPopup,jitsiChillZone,silentZone,jitsiMeetingRoom,clock,to-conference,from-conference"
      data-wa-preview-zone-overlay-count={String(WORKADVENTURE_PREVIEW_OFFICE_ZONES.length)}
      data-wa-preview-avatar-count={String(WORKADVENTURE_PREVIEW_STATS.reusableAvatarCount)}
      data-wa-preview-office-zone-count={String(WORKADVENTURE_PREVIEW_STATS.officeZoneCount)}
      data-wa-preview-tileset-count={String(WORKADVENTURE_PREVIEW_TILESET_COUNT)}
    >
      <div className="wa-preview-copy">
        <p className="eyebrow">WorkAdventure direction preview</p>
        <h2>Tile-map virtual office sample</h2>
        <p>
          Preview-only 2D office surface based on the official WorkAdventure map-starter-kit office map. It demonstrates
          walkable versus collision tiles, interaction zones, and reusable sprite placeholders without replacing the
          production React Three Fiber scene.
        </p>
        <p className="wa-preview-license-note" data-wa-preview-license-note>
          Official WorkAdventure starter-kit assets stay repo-local here and are labeled for WorkAdventure-map-only use
          under the bundled upstream license files.
        </p>
      </div>
      <div className="wa-preview-layout">
        <div className="wa-preview-surface-shell">
          <div className="wa-preview-surface" data-wa-preview-surface>
            <img
              className="wa-preview-thumbnail"
              src={WORKADVENTURE_PREVIEW_THUMBNAIL_PATH}
              alt="Official WorkAdventure starter-kit office map thumbnail"
            />
            <div className="wa-preview-grid wa-preview-grid--walkable" aria-hidden="true" />
            <div className="wa-preview-grid wa-preview-grid--collision" aria-hidden="true" />
            {WORKADVENTURE_PREVIEW_OFFICE_ZONES.map((zone) => (
              <div
                key={zone.id}
                className="wa-preview-zone"
                data-wa-preview-zone
                data-wa-preview-zone-id={zone.id}
                data-wa-preview-zone-accent={zone.accent}
                style={{
                  left: `${zone.left * 100}%`,
                  top: `${zone.top * 100}%`,
                  width: `${zone.width * 100}%`,
                  height: `${zone.height * 100}%`,
                  ["--wa-zone-accent" as "--wa-zone-accent"]: zone.accent,
                }}
                aria-label={`${zone.label}: ${zone.description}`}
              >
                <span>{zone.label}</span>
              </div>
            ))}
            {WORKADVENTURE_PREVIEW_AVATARS.map((avatar) => (
              <div
                key={avatar.id}
                className="wa-preview-avatar"
                data-wa-preview-avatar
                data-wa-preview-avatar-id={avatar.id}
                style={{
                  left: `${avatar.left * 100}%`,
                  top: `${avatar.top * 100}%`,
                  ["--wa-avatar-hue" as "--wa-avatar-hue"]: avatar.hue,
                }}
                aria-label={`${avatar.label}, ${avatar.role}`}
              >
                <span className="wa-preview-avatar-sprite" aria-hidden="true">
                  <span />
                  <span />
                </span>
                <span className="wa-preview-avatar-tag">{avatar.label}</span>
              </div>
            ))}
            <div className="wa-preview-legend" data-wa-preview-legend>
              <span><i className="wa-preview-chip wa-preview-chip--walkable" /> Walkable lanes</span>
              <span><i className="wa-preview-chip wa-preview-chip--collision" /> Collision solids</span>
              <span><i className="wa-preview-chip wa-preview-chip--zone" /> Interaction zones</span>
              <span><i className="wa-preview-chip wa-preview-chip--avatar" /> Reusable avatar placeholders</span>
            </div>
          </div>
        </div>
        <aside className="wa-preview-spec">
          <div className="wa-preview-stat-grid">
            <article>
              <strong>{WORKADVENTURE_PREVIEW_STATS.mapWidthTiles} x {WORKADVENTURE_PREVIEW_STATS.mapHeightTiles}</strong>
              <span>Starter-kit office tile map</span>
            </article>
            <article>
              <strong>{WORKADVENTURE_PREVIEW_STATS.walkableTileCount}</strong>
              <span>Walkable tile cells</span>
            </article>
            <article>
              <strong>{WORKADVENTURE_PREVIEW_STATS.collisionTileCount}</strong>
              <span>Collision-marked cells</span>
            </article>
            <article>
              <strong>{WORKADVENTURE_PREVIEW_STATS.interactionZoneCount}</strong>
              <span>Object-layer trigger zones</span>
            </article>
          </div>
          <div className="wa-preview-provenance-card">
            <h3>Bundled provenance</h3>
            <p>Repo-local office thumbnail, TMJ map, tilesets, and upstream license files are pinned under the existing prototype static tree.</p>
            <dl>
              <div>
                <dt>Map</dt>
                <dd><code>office.tmj</code> plus <code>office.png</code></dd>
              </div>
              <div>
                <dt>Tilesets</dt>
                <dd>{WORKADVENTURE_PREVIEW_TILESET_COUNT} official WA starter-kit PNGs</dd>
              </div>
              <div>
                <dt>License scope</dt>
                <dd>WorkAdventure map only</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </section>
  );
}
