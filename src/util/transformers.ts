import { ValueTransformer } from "typeorm"
import BigNumber from "bignumber.js"

export const BigNumberTransformer: ValueTransformer = {
  to: (num: BigNumber) =>
    num === undefined ? undefined :
    num === null ? null :
    num.toString(10),
  from: (str: string) =>
    str === undefined ? undefined :
    str === null ? null :
    new BigNumber(str),
}