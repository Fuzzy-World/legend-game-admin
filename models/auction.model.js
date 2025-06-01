const db = require('../config/db.config');

// 获取所有拍卖记录（修正版）
async function getActiveauction() {
  const [rows] = await db.execute(`
      SELECT * FROM v_auction_items 
ORDER BY 
    CASE 状态 
        WHEN '上架中' THEN 1 
        WHEN '已完成' THEN 2 
        WHEN '流拍' THEN 3 
    END;
  `);
  return rows;
}



// 更新最高出价
// 更新最高出价（简化版，仅更新价格和出价者，其他逻辑由触发器处理）
async function updateBid(id, bidAmount, bidderId) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    
    const [charResult] = await connection.execute(
      'SELECT char_id FROM `character` WHERE account_id = ? LIMIT 1',
      [bidderId]
    );
    if (charResult.length === 0) throw new Error('用户未创建游戏角色');
    const bidderCharId = charResult[0].char_id;

    const [result] = await connection.execute(
      `UPDATE auction_item 
       SET current_highest_bid = ?, 
           last_bidder_id = ?,
           last_bid_time = NOW()
       WHERE auction_id = ? 
         AND end_time > NOW() 
         AND current_highest_bid < ? 
         AND status = '上架中'`,
      [bidAmount, bidderId, id, bidAmount]
    );
    
    if (result.affectedRows === 0) throw new Error('报价失败（竞态条件）');
    
    await connection.commit();
    return true;
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

// 根据ID获取拍卖详情（修正版）
async function getAuctionById(id) {
  try {
    const [rows] = await db.execute(`
      SELECT 
        a.*, 
        COALESCE(t.item_name, '已删除物品') AS item_name,
        COALESCE(c.char_name, '未知卖家') AS seller_name 
      FROM auction_item a
      LEFT JOIN player_item i ON a.item_inst_id = i.item_inst_id
      LEFT JOIN item_template t ON i.item_id = t.item_id
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
    JOIN player_item i ON a.item_inst_id = i.item_inst_id
    JOIN item_template t ON i.item_id = t.item_id
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
    JOIN player_item i ON a.item_inst_id = i.item_inst_id
    JOIN item_template t ON i.item_id = t.item_id
    WHERE a.last_bidder_id = ?
    ORDER BY a.last_bid_time DESC
  `, [userId]);
  return rows;
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
};