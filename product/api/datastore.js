import { query, getClient } from './db.js';

/**
 * PostgreSQL-based data storage for spaces
 */

const SCHEMA_NAME = 'youpick';

// Get or create a space
async function getSpace(spaceId) {
  try {
    const result = await query(
      `SELECT * FROM ${SCHEMA_NAME}.spaces WHERE space_id = $1`,
      [spaceId]
    );

    if (result.rows.length > 0) {
      const space = result.rows[0];
      return {
        items: space.data.items || [],
        lastPicked: space.data.lastPicked || null,
        created: space.created_at,
        lastModified: space.last_modified
      };
    }

    // Create new space if it doesn't exist
    const newSpace = {
      items: [],
      lastPicked: null
    };

    await query(
      `INSERT INTO ${SCHEMA_NAME}.spaces (space_id, data) VALUES ($1, $2)`,
      [spaceId, JSON.stringify(newSpace)]
    );

    return {
      items: [],
      lastPicked: null,
      created: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting space:', error);
    throw error;
  }
}

// Update a space's data
async function updateSpace(spaceId, data) {
  try {
    const jsonData = {
      items: data.items || [],
      lastPicked: data.lastPicked || null
    };

    const result = await query(
      `UPDATE ${SCHEMA_NAME}.spaces
       SET data = $2
       WHERE space_id = $1
       RETURNING *`,
      [spaceId, JSON.stringify(jsonData)]
    );

    if (result.rows.length === 0) {
      // If space doesn't exist, create it
      await query(
        `INSERT INTO ${SCHEMA_NAME}.spaces (space_id, data) VALUES ($1, $2)`,
        [spaceId, JSON.stringify(jsonData)]
      );
    }

    return true;
  } catch (error) {
    console.error('Error updating space:', error);
    throw error;
  }
}

// Add an item to a space
async function addItem(spaceId, item) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Get current space data
    const result = await client.query(
      `SELECT data FROM ${SCHEMA_NAME}.spaces WHERE space_id = $1 FOR UPDATE`,
      [spaceId]
    );

    let data;
    if (result.rows.length === 0) {
      // Create new space if it doesn't exist
      data = { items: [], lastPicked: null };
      await client.query(
        `INSERT INTO ${SCHEMA_NAME}.spaces (space_id, data) VALUES ($1, $2)`,
        [spaceId, JSON.stringify(data)]
      );
    } else {
      data = result.rows[0].data;
    }

    // Add the new item
    if (!data.items) data.items = [];
    data.items.push(item);

    // Update the space
    await client.query(
      `UPDATE ${SCHEMA_NAME}.spaces SET data = $2 WHERE space_id = $1`,
      [spaceId, JSON.stringify(data)]
    );

    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding item:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Remove an item from a space
async function removeItem(spaceId, index) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Get current space data
    const result = await client.query(
      `SELECT data FROM ${SCHEMA_NAME}.spaces WHERE space_id = $1 FOR UPDATE`,
      [spaceId]
    );

    if (result.rows.length === 0) {
      throw new Error('Space not found');
    }

    const data = result.rows[0].data;

    // Remove the item at the specified index
    if (data.items && index >= 0 && index < data.items.length) {
      data.items.splice(index, 1);

      // Clear lastPicked if it references the deleted item or a higher index
      if (data.lastPicked && data.lastPicked.index >= index) {
        data.lastPicked = null;
      }
    } else {
      throw new Error('Invalid item index');
    }

    // Update the space
    await client.query(
      `UPDATE ${SCHEMA_NAME}.spaces SET data = $2 WHERE space_id = $1`,
      [spaceId, JSON.stringify(data)]
    );

    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error removing item:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Update lastPicked for a space
async function updateLastPicked(spaceId, pickedData) {
  try {
    const result = await query(
      `UPDATE ${SCHEMA_NAME}.spaces
       SET data = jsonb_set(data, '{lastPicked}', $2::jsonb)
       WHERE space_id = $1
       RETURNING *`,
      [spaceId, JSON.stringify(pickedData)]
    );

    if (result.rows.length === 0) {
      throw new Error('Space not found');
    }

    return true;
  } catch (error) {
    console.error('Error updating lastPicked:', error);
    throw error;
  }
}

// Check if a space exists
async function spaceExists(spaceId) {
  try {
    const result = await query(
      `SELECT 1 FROM ${SCHEMA_NAME}.spaces WHERE space_id = $1`,
      [spaceId]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking space existence:', error);
    throw error;
  }
}

// Get all spaces (for migration or admin purposes)
async function getAllSpaces() {
  try {
    const result = await query(
      `SELECT space_id, data, created_at, last_modified
       FROM ${SCHEMA_NAME}.spaces
       ORDER BY last_modified DESC`
    );

    return result.rows.map(row => ({
      spaceId: row.space_id,
      items: row.data.items || [],
      lastPicked: row.data.lastPicked || null,
      created: row.created_at,
      lastModified: row.last_modified
    }));
  } catch (error) {
    console.error('Error getting all spaces:', error);
    throw error;
  }
}

export {
  getSpace,
  updateSpace,
  addItem,
  removeItem,
  updateLastPicked,
  spaceExists,
  getAllSpaces
};