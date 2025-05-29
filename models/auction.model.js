const db = require('../config/db.config');



// 修改后（获取所有拍卖记录）
async function getActiveauction() {
  const [rows] = await db.execute(`
    SELECT 
      a.*,
      a.buy_now_price,
      t.item_name,  
      acc.email AS seller_email
    FROM auction_item a
    JOIN player_item i ON a.item_inst_id = i.item_inst_id  -- 修正关联条件
    JOIN item_template t ON i.item_id = t.item_id          -- 使用i.item_id关联模板表
    JOIN \`character\` c ON a.seller_id = c.char_id
    JOIN account acc ON c.account_id = acc.account_id
    ORDER BY a.end_time DESC  
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
        a.auction_id,
        a.current_highest_bid,
        a.buy_now_price 
       FROM auction_item a
       WHERE a.auction_id = ? 
       AND a.end_time > NOW() 
       AND (a.current_highest_bid < ? OR ? >= a.buy_now_price)`,
      [id, bidAmount, bidAmount]
    );
    
    if (auction.length === 0) {
      await connection.rollback();
      return false;
    }

    const newStatus = bidAmount >= auction[0].buy_now_price ? '已完成' : '上架中';
    
    // 修改SQL添加last_bid_time字段
    const [result] = await connection.execute(
      `UPDATE auction_item SET 
        current_highest_bid = ?,
        last_bidder_id = ?,
        status = ?, 
        last_bid_time = NOW(), 
        end_time = IF(? >= buy_now_price, NOW(), end_time) 
      WHERE auction_id = ?`,
      [bidAmount, bidderId, newStatus, bidAmount, id]
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
  try {
    const [rows] = await db.execute(`
      SELECT 
        a.*, 
        COALESCE(t.item_name, '已删除物品') AS item_name,
        COALESCE(c.char_name, '未知卖家') AS seller_name 
      FROM auction_item a
      LEFT JOIN item_template t ON a.item_inst_id = t.item_id
      LEFT JOIN \`character\` c ON a.seller_id = c.char_id
      WHERE auction_id = ?`, [id]);
    
    return rows[0] || null;
  } catch (error) {
    console.error('获取拍卖信息失败:', error);
    return null;
  }
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
async function updateAuction(id, status, buy_now_price, current_highest_bid, end_time) {
  // 添加参数默认值处理
  buy_now_price = buy_now_price !== undefined ? buy_now_price : null;
  current_highest_bid = current_highest_bid || 0;
  
  const validStatuses = ['上架中', '已完成', '流拍'];
  if (!validStatuses.includes(status)) {
    throw new Error('无效的拍卖状态');
  }
  
  const [result] = await db.execute(
    `UPDATE auction_item SET status = ?, buy_now_price = ?, current_highest_bid = ?, end_time = ? 
    WHERE auction_id = ?`,  
    [status, buy_now_price, current_highest_bid, end_time, id] 
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