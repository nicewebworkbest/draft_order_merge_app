const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DraftOrdersSchema = new Schema({
	draft_order_id: String,
	customer_id: String,
	order_data: Object
});

module.exports = mongoose.model('Draft_Orders', DraftOrdersSchema);