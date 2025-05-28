const db = require('../config/db.config');

// 获取上架中的拍卖记录
async function getActiveauction() {
  const [rows] = await db.execute(`
    SELECT 
      a.*, 
      t.item_name,
      acc.email AS seller_email
    FROM auction_item a
    JOIN item_template t ON a.item_inst_id = t.item_id
    JOIN \`character\` c ON a.seller_id = c.char_id
    JOIN account acc ON c.account_id = acc.account_id
    WHERE a.status = '上架中' 
    ORDER BY a.end_time DESC
  `);
  return rows;
}

// 修改后（获取所有拍卖记录）
async function getActiveauction() {
  const [rows] = await db.execute(`
    SELECT 
      a.*, 
      t.item_name,
      acc.email AS seller_email
    FROM auction_item a
    JOIN item_template t ON a.item_inst_id = t.item_id
    JOIN \`character\` c ON a.seller_id = c.char_id
    JOIN account acc ON c.account_id = acc.account_id
    ORDER BY 
      CASE  
        WHEN a.status = '上架中' THEN 1 
        WHEN a.status = '已完成' THEN 2 
        WHEN a.status = '流拍' THEN 3 
      END, 
      a.end_time DESC  
  `);
  return rows;
}

// 更新最高出价
async function updateBid(id, bidAmount, bidderId) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    
    const [auction] = await connection.execute(
      `SELECT 
        auction_id,
        current_highest_bid
       FROM auction_item 
       WHERE auction_id = ? 
       AND status = '上架中' 
       AND end_time > NOW() 
       AND current_highest_bid < ?`,
      [id, bidAmount]
    );
    
    if (auction.length === 0) {
      await connection.rollback();
      return false;
    }
    
    const [result] = await connection.execute(
      `UPDATE auction_item SET 
        current_highest_bid = ?,
        last_bidder_id = ?,
        last_bid_time = NOW()
      WHERE auction_id = ?`,
      [bidAmount, bidderId, id]
    );
    
    const success = result.affectedRows > 0;
    if (success) {
      await connection.commit();
    } else {
      await connection.rollback();
    }
    return success;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// 删除拍卖
async function deleteAuction(id) {
  const [result] = await db.execute('DELETE FROM auction_item WHERE auction_id = ?', [id]);
  return result.affectedRows > 0;
}

// 根据ID获取拍卖详情
async function getAuctionById(id) {
  const [rows] = await db.execute(`
    SELECT a.*, t.item_name, c.char_name AS seller_name 
    FROM auction_item a
    JOIN item_template t ON a.item_inst_id = t.item_id
    JOIN \`character\` c ON a.seller_id = c.char_id
    WHERE auction_id = ?`, [id]);
  return rows[0];
}

// 创建拍卖
async function createAuction(itemInstId, sellerId, startPrice, buyNowPrice, endTime) {
  const [result] = await db.execute(
    `INSERT INTO auction_item 
    (item_inst_id, seller_id, start_price, buy_now_price, current_highest_bid, end_time, status) 
    VALUES (?, ?, ?, ?, ?, ?, '上架中')`,
    [itemInstId, sellerId, startPrice, buyNowPrice, startPrice, endTime]
  );
  return result.insertId;
}

// 获取用户参与的拍卖
async function getUserauction(userId) {
  const [rows] = await db.execute(`
    SELECT a.*, t.item_name
    FROM auction_item a
    JOIN item_template t ON a.item_inst_id = t.item_id
    WHERE a.seller_id = ?
    ORDER BY a.end_time DESC  
  `, [userId]);
  return rows;
}

// 获取用户的出价记录
async function getUserBids(userId) {
  const [rows] = await db.execute(`
    SELECT a.*, t.item_name, a.current_highest_bid AS my_bid
    FROM auction_item a
    JOIN item_template t ON a.item_inst_id = t.item_id
    WHERE a.last_bidder_id = ?
    ORDER BY a.last_bid_time DESC
  `, [userId]);
  return rows;
}

// 自动结束到期拍卖
async function closeExpiredauction() {
  const [result] = await db.execute(`
    UPDATE auction_item 
    SET status = '流拍'  
    WHERE status = '上架中' 
    AND end_time <= NOW()
  `);
  return result.affectedRows;
}

// 更新拍卖状态、当前最高出价和结束时间
async function updateAuction(id, status, current_highest_bid, end_time) {
  const validStatuses = ['上架中', '已完成', '流拍'];
  if (!validStatuses.includes(status)) {
    throw new Error('无效的拍卖状态');
  }
  
  const [result] = await db.execute(
    `UPDATE auction_item SET status = ?, current_highest_bid = ?, end_time = ? 
    WHERE auction_id = ?`,
    [status, current_highest_bid, end_time, id]
  );
  return result.affectedRows > 0;
}

module.exports = {
  getActiveauction,
  updateBid,
  deleteAuction,
  getAuctionById,
  createAuction,
  updateAuction,
  getUserauction,
  getUserBids,
  closeExpiredauction
};