/**
 * Shared helper for building the common head of an {@link InspectableData} object.
 *
 * RAM, ROM, Clock and PIA6820 all repeated the same id/type/name + optional
 * `__address`/`__addressName` spread at the top of `getInspectable()`. This
 * helper produces that head once; callers merge their component-specific
 * `state`/`stats`/children and backward-compat flat fields via `extra`.
 */
import { InspectableBase, InspectableData, WithBusMetadata } from '../types';

export function baseInspectable(component: InspectableBase, extra: Partial<InspectableData> = {}): InspectableData {
    const self = component as WithBusMetadata<InspectableBase>;
    return {
        id: component.id,
        type: component.type,
        name: component.name ?? '',
        ...(self.__address !== undefined && { address: self.__address }),
        ...(self.__addressName !== undefined && { addressName: self.__addressName }),
        ...extra,
    };
}
