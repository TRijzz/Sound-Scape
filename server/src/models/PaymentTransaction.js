import mongoose from 'mongoose';

const paymentTransactionSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ['khalti'],
      required: true,
      default: 'khalti',
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    vinyl: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vinyl',
      required: true,
      index: true,
    },
    purchase_order_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    purchase_order_name: {
      type: String,
      required: true,
      trim: true,
    },
    pidx: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    amount_paisa: {
      type: Number,
      required: true,
      min: 1,
    },
    amount_rupees: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      default: 'Initiated',
      index: true,
    },
    transaction_id: {
      type: String,
      default: null,
    },
    fee: {
      type: Number,
      default: 0,
    },
    refunded: {
      type: Boolean,
      default: false,
    },
    payment_url: {
      type: String,
      default: '',
    },
    website_url: {
      type: String,
      default: '',
    },
    return_url: {
      type: String,
      default: '',
    },
    customer_info: {
      name: { type: String, default: '' },
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
    },
    callback_payload: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    lookup_payload: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    completed_at: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model('PaymentTransaction', paymentTransactionSchema);
