// This file is part of the AppIndicator/KStatusNotifierItem GNOME Shell extension
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License
// as published by the Free Software Foundation; either version 2
// of the License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program; if not, write to the Free Software
// Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.

export function getBestPixmap(pixmapsVariant, preferredSize) {
    if (!pixmapsVariant)
        throw new TypeError('null pixmapsVariant');

    const pixmapsVariantsArray = new Array(pixmapsVariant.n_children());
    if (!pixmapsVariantsArray.length)
        throw TypeError('Empty Icon found');

    for (let i = 0; i < pixmapsVariantsArray.length; ++i)
        pixmapsVariantsArray[i] = pixmapsVariant.get_child_value(i);

    const pixmapsSizedArray = pixmapsVariantsArray.map((pixmapVariant, index) => ({
        width: pixmapVariant.get_child_value(0).unpack(),
        height: pixmapVariant.get_child_value(1).unpack(),
        index,
    }));

    const sortedIconPixmapArray = pixmapsSizedArray.sort(
        ({width: widthA, height: heightA}, {width: widthB, height: heightB}) => {
            const areaA = widthA * heightA;
            const areaB = widthB * heightB;

            return areaA - areaB;
        });

    // we prefer any pixmap that is equal or bigger than our requested size
    const qualifiedIconPixmapArray = sortedIconPixmapArray.filter(({width, height}) =>
        width >= preferredSize && height >= preferredSize);

    const {width, height, index} = qualifiedIconPixmapArray.length > 0
        ? qualifiedIconPixmapArray[0] : sortedIconPixmapArray.pop();

    const pixmapVariant = pixmapsVariantsArray[index].get_child_value(2);
    const rowStride = width * 4; // hopefully this is correct

    return {pixmapVariant, width, height, rowStride};
}
