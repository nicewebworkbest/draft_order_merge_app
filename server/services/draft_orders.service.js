const Draft_Orders = require('../models/draft_orders.model');

const getDraftOrdersByCustomerService = async (customer_id) => { 
	const data = await Draft_Orders.find({customer_id: customer_id}); 
	return data; 
};

const getFirstDraftOrderService = async () => { 
	const data = await Draft_Orders.findOne(); 
	return data; 
};

const addDraftOrdersService = async (draft_order) => { 
	var query = {draft_order_id: draft_order.id},
		update = {draft_order_id: draft_order.id, customer_id: draft_order.customer.id, order_data: draft_order},
		options = {upsert: true, new: true, setDefaultsOnInsert: true};

	await Draft_Orders.findOneAndUpdate(query, update, options);
	return;
};

const removeDraftOrderService = async (ids) => {
	await Draft_Orders.deleteMany({draft_order_id: {$in: ids}}); 
};


module.exports = { getDraftOrdersByCustomerService, getFirstDraftOrderService, addDraftOrdersService, removeDraftOrderService };