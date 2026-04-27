def calculate_bill(units):
    if units <= 100:
        return units * 9
    elif units <= 200:
        return (100 * 9) + ((units - 100) * 12)
    else:
        return (100 * 9) + (100 * 12) + ((units - 200) * 15)