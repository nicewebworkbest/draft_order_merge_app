import React from 'react';
import { Button } from 'react-bootstrap';
import axios from 'axios';

class Index extends React.Component {
  
	state = {
		status: 'start',
		isStarted: false,
		statusString: ''
	};

	// async componentDidUpdate() {
	// 	this.processDraftOrders();
	// }

	processDraftOrders = async () => {
		console.log('processDraftOrders...');
		axios({
			url: '/process-draft-orders',
			data: { status: this.state.status },
			method: 'POST'
		})
		.then(res => {
			console.log(res.data);
			this.setState({statusString: res.data.statusString});
			this.setState({status: res.data.status}, () => {
				if (res.data.status != 'complete') {
					this.processDraftOrders();
				}
			});
		});
	}

	handleClick = async () => {
		this.setState({isStarted: true});
		this.setState({statusString: 'Started...'});
		this.setState({status: 'save_draft_orders_to_db'}, () => {
			this.processDraftOrders();

		});
	}

	render() {
		return (
			<div>
				<Button
					variant="primary"
					disabled={this.state.isStarted}
					onClick={!this.state.isStarted ? this.handleClick : null}
				>
					Start
				</Button>
				<p>{this.state.statusString}</p>
			</div>
		);
	}

	async componentDidMount() {

	}
}

export default Index;