const db = require('../config/db.config');

module.exports = {
    getMailsByCharId: async (charId) => {
        try {
            const [mails] = await db.query(`
                SELECT * FROM v_player_mail WHERE receiver_id =?
            `, [charId]);
            return mails;
        } catch (error) {
            throw error;
        }
    },
    
    createMail: async (mailData) => {
        let connection = null;  // 在外部声明连接变量
        try {
            const { sender_id, receiver_id, title, content, attachments = [] } = mailData;
            connection = await db.getConnection();  // 赋值已声明的连接
            
            await connection.beginTransaction();
            
            // 插入主邮件
            const [mailResult] = await connection.query(
                `INSERT INTO mail 
                (sender_id, receiver_id, title, content, send_time)
                VALUES (?, ?, ?, ?, NOW())`,
                [sender_id, receiver_id, title, content]
            );
            
            // 插入附件（如果有）
            if(attachments.length > 0) {
                await connection.query(
                    `INSERT INTO mail_attachment 
                    (mail_id, item_id, count)
                    VALUES ${attachments.map(() => '(?, ?, ?)').join(',')}`,
                    attachments.flatMap(att => [mailResult.insertId, att.item_id, att.count])
                );
            }
            
            await connection.commit();
            return mailResult.insertId;
        } catch (error) {
            if(connection) await connection.rollback();  // 添加连接存在性检查
            throw error;
        } finally {
            if(connection) connection.release();  // 添加连接存在性检查
        }
    },
    
    getMailById: async (mailId, charId) => {
        try {
            const [mail] = await db.query(`
                 SELECT * FROM v_mail_simple_attachments WHERE mail_id =? AND _id =?
            `, [mailId, charId]);
            
            if (mail.length === 0) return null;
            
            // 组织附件数据
            const attachments = mail
                .filter(m => m.item_id)
                .map(m => ({ item_id: m.item_id, count: m.count }));
            
            return {
                ...mail[0],
                attachments
            };
        } catch (error) {
            throw error;
        }
    }
};