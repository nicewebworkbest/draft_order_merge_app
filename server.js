require('isomorphic-fetch');
const dotenv = require('dotenv');
dotenv.config();
const port = parseInt(process.env.PORT, 10) || 3000;
const dev = process.env.NODE_ENV !== 'production';
const express = require('express');
const next = require('next');
const axios = require('axios');
var router = express.Router();
const bodyParser = require('body-parser');
const app = next({ dev });
const handle = app.getRequestHandler();
//const app = express();

const Shopify = require('shopify-api-node');
const initDB = require('./server/database');
const {addDraftOrdersService, getFirstDraftOrderService, getDraftOrdersByCustomerService, removeDraftOrderService} = require('./server/services/draft_orders.service');

const {
	SHOPIFY_API_KEY,
	SHOPIFY_API_PASSWORD,
	SHOPIFY_SECRET_KEY,
	SHOPNAME,
	HOST,
} = process.env;

const shopify = new Shopify({
	shopName: SHOPNAME,
	apiKey: SHOPIFY_API_KEY,
	password: SHOPIFY_API_PASSWORD
});

app.prepare().then(() => {
	initDB();

	const server = express();

	server.use(bodyParser.raw({type: 'application/json'}));
	server.use(bodyParser.urlencoded({
		extended: true
	}));

	server.get('*', async (req, res) => {
		return handle(req, res);
	});

	server.post('/process-draft-orders', async (req, res) => {
		const req_data = JSON.parse(req.body.toString());
		//console.log(req_data.status);
		
		if (req_data.status == 'save_draft_orders_to_db') {
			//Get draftorders from the store.
			//let draft_orders = await shopify.draftOrder.list({limit: 2});
			let draft_orders = await shopify.draftOrder.list({status: "open"});

			for (let index = 0; index < draft_orders.length; index++) {
				// Save draftorder to MongoDB and remove it from the store.
				await addDraftOrdersService(draft_orders[index]);
				await shopify.draftOrder.delete(draft_orders[index].id);
			}
			
			if (draft_orders.length) {
				res.send({ status: 'save_draft_orders_to_db', statusString: 'Saving draft orders to DB...'});
				return;
			} else {
				res.send({ status: 'create_merged_draft_orders', statusString: 'Merging draft orders...'});
				return;
			}
		} else if (req_data.status == 'create_merged_draft_orders') {
			//Get the first draft order.
			let draft_order_data = await getFirstDraftOrderService();

			if (draft_order_data) {
				let draft_order = draft_order_data.order_data;

				const customer_id = draft_order.customer.id;

				// Remove the first draft order.
				await removeDraftOrderService([draft_order.id]);

				// Create a new draft order.
				let new_draft_order = {};
				//new_draft_order.id = draft_order.id;
				new_draft_order.note = draft_order.note;
				new_draft_order.email = draft_order.email;
				new_draft_order.taxes_included = draft_order.taxes_included;
				new_draft_order.currency = draft_order.currency;
				new_draft_order.invoice_sent_at = draft_order.invoice_sent_at;
				//new_draft_order.created_at = draft_order.created_at;
				//new_draft_order.updated_at = draft_order.updated_at;
				new_draft_order.tax_exempt = draft_order.tax_exempt;
				//new_draft_order.completed_at = draft_order.completed_at;
				//new_draft_order.name = draft_order.name;
				//new_draft_order.status = draft_order.status;
				new_draft_order.line_items = draft_order.line_items;
				new_draft_order.shipping_address = draft_order.shipping_address;
				new_draft_order.billing_address = draft_order.billing_address;
				//new_draft_order.invoice_url = draft_order.invoice_url;
				new_draft_order.applied_discount = draft_order.applied_discount;
				//new_draft_order.order_id = draft_order.order_id;
				new_draft_order.shipping_line = draft_order.shipping_line;
				//new_draft_order.tax_lines = draft_order.tax_lines;
				new_draft_order.tags = draft_order.tags;
				new_draft_order.note_attributes = draft_order.note_attributes;
				//new_draft_order.total_price = draft_order.total_price;
				//new_draft_order.subtotal_price = draft_order.subtotal_price;
				//new_draft_order.total_tax = draft_order.total_tax;
				//new_draft_order.admin_graphql_api_id = draft_order.admin_graphql_api_id;
				//new_draft_order.customer.id = draft_order.customer.id;

				// Get draft orders by customer id.
				let draft_order_datas = await getDraftOrdersByCustomerService(customer_id);
				
				let draft_order_ids = [];
				for (let index = 0; index < draft_order_datas.length; index++) {
					let temp_draft_order = draft_order_datas[index].order_data;

					// Merge draft order line items.
					for (let line_item_index = 0; line_item_index < temp_draft_order.line_items.length; line_item_index++ ) {
						new_draft_order.line_items.push(temp_draft_order.line_items[line_item_index]);
					}

					// Merge draft order tax lines.
					// for (let tax_lines_index = 0; tax_lines_index < temp_draft_order.tax_lines.length; tax_lines_index++ ) {
					// 	new_draft_order.tax_lines.push(temp_draft_order.tax_lines[tax_lines_index]);
					// }

					// Sum total price, subtotal price, total tax.
					//new_draft_order.total_price += temp_draft_order.total_price;
					//new_draft_order.subtotal_price += temp_draft_order.subtotal_price;
					//new_draft_order.total_tax += temp_draft_order.total_tax;

					draft_order_ids.push(temp_draft_order.id);
				}

				//console.log('new_draft_order', new_draft_order);
				
				// Remove draft orders from database.
				await removeDraftOrderService(draft_order_ids);

				// Create a new draft order.
				const added_new_draft_order = await shopify.draftOrder.create(new_draft_order);
				//console.log('added_new_draft_order', added_new_draft_order);

				// Send an invoice for the new draft order.
				if (added_new_draft_order.email) {
					//console.log('added_new_draft_order.id', added_new_draft_order.id);
					let draft_order_invoice = { 
						to: added_new_draft_order.email,
						from: "j.smith@example.com",
						subject: "Invoice",
						custom_message: "Thank you for ordering!",
						bcc: ["webworkbestservice@gmail.com"]
					};
					//let r = await shopify.draftOrder.sendInvoice(added_new_draft_order.id, {draft_order_invoice: draft_order_invoice});
					shopify.draftOrder
						.sendInvoice(added_new_draft_order.id, {draft_order_invoice: draft_order_invoice})
						.then((draft_order_invoice) => console.log(draft_order_invoice))
  						.catch((err) => console.error(err));
				}
				
				res.send({ status: 'create_merged_draft_orders', statusString: 'Merging draft orders and send invoice...'});
				return;
			}

			res.send({ status: 'complete', statusString: 'Completed'});
			return;
		}		
		
		res.send({ status: 'complete', statusString: 'Completed'});
	});

	server.use('/', router);

	server.listen(port, () => {
		console.log(`Example app listening at http://localhost:${port}`);
	});
});

