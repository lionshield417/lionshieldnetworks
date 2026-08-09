interface Env {
	MS_TENANT_ID: string;
	MS_CLIENT_ID: string;
	MS_CLIENT_SECRET: string;
}

interface ContactForm {
	name?: string;
	company?: string;
	email?: string;
	phone?: string;
	service?: string;
	message?: string;
}

function escapeHtml(value: string) {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
	try {
		const body = (await context.request.json()) as ContactForm;

		const name = body.name?.trim() || '';
		const company = body.company?.trim() || '';
		const email = body.email?.trim() || '';
		const phone = body.phone?.trim() || '';
		const service = body.service?.trim() || '';
		const message = body.message?.trim() || '';

		if (!name || !email || !message) {
			return Response.json(
				{
					success: false,
					message: 'Name, email, and message are required.',
				},
				{ status: 400 }
			);
		}

		// Get Microsoft Graph access token
		const tokenResponse = await fetch(
			`https://login.microsoftonline.com/${context.env.MS_TENANT_ID}/oauth2/v2.0/token`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: new URLSearchParams({
					client_id: context.env.MS_CLIENT_ID,
					client_secret: context.env.MS_CLIENT_SECRET,
					scope: 'https://graph.microsoft.com/.default',
					grant_type: 'client_credentials',
				}),
			}
		);

		if (!tokenResponse.ok) {
			const errorText = await tokenResponse.text();

			console.error('TOKEN ERROR:', errorText);

			return Response.json(
				{
					success: false,
					message: 'Unable to authenticate email service.',
				},
				{ status: 500 }
			);
		}

		const tokenData = (await tokenResponse.json()) as {
			access_token: string;
		};

		// Send email through Microsoft Graph
		const graphResponse = await fetch(
			'https://graph.microsoft.com/v1.0/users/support@lionshieldnetworks.com/sendMail',
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${tokenData.access_token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					message: {
						subject: `New LionShield Website Lead - ${
							service || 'General Inquiry'
						}`,
						body: {
							contentType: 'HTML',
							content: `
								<h2>New LionShield Website Inquiry</h2>

								<p><strong>Name:</strong> ${escapeHtml(name)}</p>
								<p><strong>Company:</strong> ${escapeHtml(company || 'Not provided')}</p>
								<p><strong>Email:</strong> ${escapeHtml(email)}</p>
								<p><strong>Phone:</strong> ${escapeHtml(phone || 'Not provided')}</p>
								<p><strong>Service:</strong> ${escapeHtml(service || 'General Inquiry')}</p>

								<p><strong>Message:</strong></p>
								<p>${escapeHtml(message).replace(/\n/g, '<br />')}</p>
							`,
						},
						toRecipients: [
							{
								emailAddress: {
									address: 'support@lionshieldnetworks.com',
								},
							},
						],
						replyTo: [
							{
								emailAddress: {
									address: email,
									name,
								},
							},
						],
					},
					saveToSentItems: true,
				}),
			}
		);

		if (!graphResponse.ok) {
			const graphError = await graphResponse.text();

			console.error('GRAPH ERROR:', graphError);

			return Response.json(
				{
					success: false,
					message: 'Unable to send your request.',
				},
				{ status: 500 }
			);
		}

		return Response.json({
			success: true,
			message: 'Your request has been received.',
		});
	} catch (error) {
		console.error('CONTACT FORM ERROR:', error);

		return Response.json(
			{
				success: false,
				message: 'Something went wrong.',
			},
			{ status: 500 }
		);
	}
};