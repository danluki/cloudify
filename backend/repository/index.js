const StorageError = require("../exceptions/storage.error");
const pool = require("./../db");

class Repository {
  pool;

  constructor(pool) {
    this.pool = pool;
  }

  async addNewUser(email, pass_hash) {
    await pool.query(
      `INSERT INTO users (email, password) VALUES ('${email}', '${pass_hash}');`
    );
  }

  async setUserToken(id, token) {
    await pool.query(
      `UPDATE users SET refresh_token = '${token}' WHERE id = ${id};`
    );
  }

  async getUserByToken(refresh_token) {
    const res = await pool.query(
      `SELECT * FROM users WHERE refresh_token = '${refresh_token}';`
    );
    return res.rows[0];
  }

  async getUserByEmail(email) {
    const res = await pool.query(
      `SELECT * FROM users WHERE email = '${email}';`
    );
    return res.rows[0];
  }

  async getUserById(id) {
    const res = await pool.query(`SELECT * FROM users WHERE id = '${id}';`);
    return res.rows[0];
  }

  async createNewFolder(name, parentId, is_root = false) {
    await pool.query(
      `INSERT INTO folders (name, parent_id, is_root) VALUES ('${name}', ${parentId}, ${is_root});`
    );
  }

  async getFolderByName(name) {
    const res = await pool.query(`SELECT * FROM folders WHERE name='${name}';`);
    return await res.rows[0];
  }

  async getFolderById(id) {
    const res = await pool.query(`SELECT * FROM folders WHERE id=${id};`);
    return res.rows[0];
  }

  async getUserRootFolder(userId) {
    try {
      const res = await pool.query(
        `SELECT name, id from folders JOIN user_folders ON user_id=${userId} WHERE is_root=true;`
      );

      return res.rows[0];
    } catch (e) {
      console.log(e);
      return null;
    }
  }

  async setUserFolder(userId, folderId) {
    await pool.query(
      `INSERT INTO user_folders (user_id, folder_id) VALUES (${userId}, ${folderId});`
    );
  }

  async updateUserAvailableSpace(user, fileSize) {
    const dbUser = await this.getUserById(user.id);
    await pool.query(
      `UPDATE users SET space_available=${
        dbUser.space_available - fileSize
      }WHERE id=${user.id};`
    );

    return await this.getUserById(user.id);
  }

  async addFolderForUser(user, folderPath) {
    let folders = folderPath.split("/");
    const userRootFolder = await this.getFolderByName(user.email);
    folders.shift();
    let parentFolder = userRootFolder;
    for (let i = 0; i < folders.length; i++) {
      await this.createNewFolder(folders[i], parentFolder.id);
      parentFolder = await this.getFolderByName(folders[i]);
      await this.setUserFolder(user.id, parentFolder.id);
    }
  }

  async deleteFolder(folder, userId) {
    await pool.query(`DELETE FROM folders WHERE folder.id=${folder.id}`);
    await pool.query(
      `DELETE FROM user_folders WHERE folder_id${(folder.id =
        id)} AND user_id=${userId}`
    );
  }

  async deleteFolderForUser(userId, folderPath) {
    const folders = folderPath.split("/");

    folders.forEach(async (folder) => {
      const folderDb = await this.getFolderByName(folder);
      await this.deleteFolder(folder, userId);
    });
  }

  async updateUserFilesInfo(decoded, files, folder_id) {
    try {
      for (let i = 0; i < files.length; i++) {
        await pool.query(`INSERT INTO files (folder_id, name, size, path) VALUES
          (${folder_id},'${files[i].name}', ${files[i].size}, '${files[i].path}');
        `);
        await this.updateUserAvailableSpace(decoded, files[i].size);
      }
    } catch (e) {
      console.log(e);
    }
  }

  async getUserFolders(userId) {
    try {
      const data = await pool.query(
        `SELECT folder_id FROM user_folders WHERE user_id=${userId};`
      );
      const base_folder_id = data.rows[0].folder_id;
      const base_folder = await pool.query(
        `SELECT * FROM folders WHERE id=${base_folder_id};`
      );

      const folders = await pool.query(
        `WITH RECURSIVE r AS(
          SELECT id, parent_id, name, is_root
          FROM folders
          WHERE parent_id = ${base_folder_id}
          
          UNION
          
          SELECT folders.id, folders.parent_id, folders.name, folders.is_root
          FROM folders
            JOIN r
              ON folders.parent_id = r.id
        )
        SELECT * from r;`
      );
      folders.rows.unshift(base_folder.rows[0]);
      return folders.rows;
    } catch (e) {
      console.log(e);
      throw StorageError.DbError(e.message);
    }
  }

  async getFolderFiles(folder_id) {
    try {
      const res = await pool.query(
        `SELECT name, id, size from files WHERE folder_id = ${folder_id};`
      );
      return res.rows;
    } catch (e) {
      console.log(e);
      throw StorageError.DbError(e.message);
    }
  }

  async getFile(id){
    try{
      const res = await pool.query(`SELECT * FROM files WHERE id = ${id};`);

       return res.rows[0];
    }
    catch(e){
      console.log(e);
      throw StorageError.DbError(e.message);
    }
  }
}

module.exports = new Repository(pool);
