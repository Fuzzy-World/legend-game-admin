// ... existing code ...

async function getEditDropPage(req, res) {
  try {
    const dropId = parseInt(req.params.id);
    const drop = await dropModel.getDropById(dropId);
    
    if (!drop) {
      req.flash('error', '掉落记录不存在');
      return res.redirect('/drops');
    }
    
    // 获取物品模板的is_bind字段（关键新增逻辑）
    const itemTemplate = await itemModel.getItemTemplateById(drop.item_id);
    // 修改这里，直接使用drop的is_bind字段
    drop.is_bind = drop.is_bind;  
    res.render('drops/edit', { drop });
  } catch (error) {
    req.flash('error', `获取数据失败：${error.message}`);
    res.redirect('/drops');
  }
}

// ... existing code ...