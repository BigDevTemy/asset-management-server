"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();

    // Buildings
    const buildings = [
      { name: 'HQ North', address: '100 Main St, North City', created_at: now, updated_at: now },
      { name: 'HQ South', address: '200 Market Ave, South City', created_at: now, updated_at: now },
      { name: 'Warehouse Alpha', address: '15 Industrial Way', created_at: now, updated_at: now },
    ];

    await queryInterface.bulkInsert('buildings', buildings, {});

    // Fetch inserted building ids (assuming auto-increment and sequential order)
    const [rows] = await queryInterface.sequelize.query(
      "SELECT building_id, name FROM buildings WHERE name IN ('HQ North', 'HQ South', 'Warehouse Alpha') ORDER BY building_id"
    );
    const buildingMap = Object.fromEntries(rows.map(r => [r.name, r.building_id]));

    // Floors
    const floors = [
      { building: 'HQ North', name: 'Ground', number: 'G', created_at: now, updated_at: now },
      { building: 'HQ North', name: 'First', number: '1', created_at: now, updated_at: now },
      { building: 'HQ North', name: 'Second', number: '2', created_at: now, updated_at: now },
      { building: 'HQ South', name: 'Ground', number: 'G', created_at: now, updated_at: now },
      { building: 'HQ South', name: 'First', number: '1', created_at: now, updated_at: now },
      { building: 'Warehouse Alpha', name: 'Main', number: 'M', created_at: now, updated_at: now },
    ].map(f => ({
      building_id: buildingMap[f.building],
      name: f.name,
      number: f.number,
      created_at: f.created_at,
      updated_at: f.updated_at,
    }));

    await queryInterface.bulkInsert('floors', floors, {});

    const [floorRows] = await queryInterface.sequelize.query(
      "SELECT floor_id, name, building_id FROM floors WHERE name IN ('Ground','First','Second','Main')"
    );

    // Helper to find floor id by building and name
    const findFloorId = (buildingName, floorName) => {
      const buildingId = buildingMap[buildingName];
      const match = floorRows.find(fr => fr.building_id === buildingId && fr.name === floorName);
      return match ? match.floor_id : null;
    };

    // Rooms
    const rooms = [
      { building: 'HQ North', floor: 'Ground', name: 'Reception', code: 'N-G-REC' },
      { building: 'HQ North', floor: 'First', name: 'Engineering', code: 'N-1-ENG' },
      { building: 'HQ North', floor: 'Second', name: 'Finance', code: 'N-2-FIN' },
      { building: 'HQ South', floor: 'Ground', name: 'Lobby', code: 'S-G-LOB' },
      { building: 'HQ South', floor: 'First', name: 'Support', code: 'S-1-SUP' },
      { building: 'Warehouse Alpha', floor: 'Main', name: 'Storage A', code: 'W-M-A' },
      { building: 'Warehouse Alpha', floor: 'Main', name: 'Storage B', code: 'W-M-B' },
    ].map(r => ({
      floor_id: findFloorId(r.building, r.floor),
      name: r.name,
      code: r.code,
      created_at: now,
      updated_at: now,
    }));

    await queryInterface.bulkInsert('rooms', rooms, {});
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('rooms', null, {});
    await queryInterface.bulkDelete('floors', null, {});
    await queryInterface.bulkDelete('buildings', null, {});
  },
};
