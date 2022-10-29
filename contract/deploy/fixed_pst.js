
  // src/fixed_supply/actions/common.ts
  var isAddress = (addr) => /[a-z0-9_-]{43}/i.test(addr);

  // src/fixed_supply/actions/read/balance.ts
  var balance = async (state, { input: { target } }) => {
    const ticker = state.ticker;
    const balances = state.balances;
    if (!target || typeof target !== "string") {
      throw new ContractError("target format error");
    }
    if (!isAddress(target)) {
      throw new ContractError("not valid address");
    }
    if (typeof balances[target] !== "number") {
      return { result: { target, ticker, balance: 0 } };
    }
    return { result: { target, ticker, balance: balances[target] } };
  };

  // src/fixed_supply/actions/write/transferTokens.ts
  var transferTokens = async (state, { caller, input: { target, qty } }) => {
    const balances = state.balances;
    if (!target || typeof target !== "string") {
      throw new ContractError("target format error");
    }
    if (!isAddress(target)) {
      throw new ContractError("not valid address");
    }
    if (!qty || !Number.isInteger(qty)) {
      throw new ContractError("quantity format error");
    }
    if (qty <= 0 || caller === target) {
      throw new ContractError("Invalid token transfer");
    }
    if (!balances[caller]) {
      throw new ContractError(`Caller balance is not defined!`);
    }
    if (balances[caller] < qty) {
      throw new ContractError(`Caller balance not high enough to send ${qty} token(s)!`);
    }
    balances[caller] -= qty;
    if (target in balances) {
      balances[target] += qty;
    } else {
      balances[target] = qty;
    }
    return { state };
  };

  // src/fixed_supply/contract.ts
  async function handle(state, action) {
    const input = action.input;
    switch (input.function) {
      case "transfer":
        return await transferTokens(state, action);
      case "balance":
        return await balance(state, action);
      default:
        throw new ContractError(`No function supplied or function not recognised: "${input.function}"`);
    }
  }

